from fastapi import APIRouter, Depends, HTTPException, UploadFile, File as FastAPIFile
from fastapi.responses import Response, JSONResponse
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from uuid import uuid4
import base64
from io import BytesIO
import PyPDF2
#from pdf2image import convert_from_bytes

from database import get_db
from models import File, FileImage
from schemas import FileCreate, FileUpdate, FileResponse, FileContentResponse, FileImageResponse
from services.auth_service import validate_token
from models import User

router = APIRouter(
    prefix="/api/files",
    tags=["files"]
)

async def get_file_content_as_text(file_id: str, db: Session) -> str:
    """Get a file's content as text, used for template processing"""
    file = db.query(File).filter(File.file_id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
    
    # If we have extracted text, use that
    if file.extracted_text:
        return file.extracted_text
    
    # For text files, try to decode as UTF-8
    if file.mime_type.startswith('text/') or file.mime_type in ['application/json', 'application/javascript']:
        try:
            return file.content.decode('utf-8')
        except UnicodeDecodeError:
            pass
    
    # For binary files or failed text decoding, return base64 encoded
    return base64.b64encode(file.content).decode('utf-8')

@router.post("", response_model=FileResponse)
async def create_file(
    file: UploadFile = FastAPIFile(...),
    description: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Create a new file"""
    try:
        content = await file.read()
        extracted_text = ""
        if file.content_type == 'text/plain':
            extracted_text = content.decode('utf-8')
        else:
            extracted_text = ""
        db_file = File(
            file_id=str(uuid4()),
            user_id=current_user.user_id,
            name=file.filename,
            description=description,
            content=content,  # Store as binary,
            extracted_text=extracted_text,
            mime_type=file.content_type,
            size=len(content)
        )
        
        db.add(db_file)
        db.commit()
        db.refresh(db_file)

        print("File content type: ", file.content_type)
        if file.content_type == 'application/pdf':
            print("Extracting pdf content...")
            try:
                # Extract text first
                pdf_reader = PyPDF2.PdfReader(BytesIO(content))
                extracted_text = ""
                print("Extracting text from PDF pages. Pages: ", len(pdf_reader.pages))
                for page in pdf_reader.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text
                
                # Save text extraction immediately
                db_file.extracted_text = extracted_text
                db.commit()
                print("Successfully saved PDF text extraction")

                # Try image extraction
                try:
                    print("Attempting to extract images from PDF")
                    images = convert_from_bytes(content)
                    for image in images:
                        buffered = BytesIO()
                        image.save(buffered, format="PNG")
                        image_data = buffered.getvalue()
                        db_image = FileImage(
                            image_id=str(uuid4()),
                            file_id=db_file.file_id,
                            image_data=image_data,
                            mime_type="image/png"
                        )
                        db.add(db_image)
                    db.commit()
                    print("Successfully extracted and saved PDF images")
                except Exception as image_error:
                    print("Error extracting PDF images (text extraction was still saved):", str(image_error))
                
                db.refresh(db_file)
            except Exception as extraction_error:
                print("Error extracting PDF data:", extraction_error)
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(extraction_error)}")

        return FileResponse.model_validate(db_file)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[FileResponse])
def get_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Get all files for the current user"""
    files = db.query(File).filter(File.user_id == current_user.user_id).all()
    return [FileResponse.model_validate(f) for f in files]

@router.get("/{file_id}", response_model=FileResponse)
def get_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Get a specific file"""
    file = db.query(File).filter(
        File.file_id == file_id,
        File.user_id == current_user.user_id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse.model_validate(file)

@router.get("/{file_id}/content")
def get_file_content(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Get a file's content"""
    file = db.query(File).filter(
        File.file_id == file_id,
        File.user_id == current_user.user_id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # For text files, try to return as plain text
    if file.mime_type.startswith('text/') or file.mime_type in ['application/json', 'application/javascript']:
        try:
            text_content = file.content.decode('utf-8')
            return JSONResponse(content={"content": text_content})
        except UnicodeDecodeError:
            # If we can't decode as UTF-8, fall back to base64
            pass
    
    # For binary files or failed text decoding, return base64 encoded
    encoded_content = base64.b64encode(file.content).decode('utf-8')
    return JSONResponse(content={"content": encoded_content, "encoding": "base64"})

@router.get("/{file_id}/download")
def download_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Download a file with proper content type"""
    file = db.query(File).filter(
        File.file_id == file_id,
        File.user_id == current_user.user_id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    return Response(
        content=file.content,
        media_type=file.mime_type,
        headers={
            'Content-Disposition': f'attachment; filename="{file.name}"'
        }
    )

@router.put("/{file_id}", response_model=FileResponse)
def update_file(
    file_id: str,
    file_update: FileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Update a file"""
    file = db.query(File).filter(
        File.file_id == file_id,
        File.user_id == current_user.user_id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        update_data = file_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(file, key, value)
            if key == 'content':
                file.size = len(value)
                
        file.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(file)
        return FileResponse.model_validate(file)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{file_id}")
def delete_file(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Delete a file"""
    file = db.query(File).filter(
        File.file_id == file_id,
        File.user_id == current_user.user_id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # Delete associated file images first
        db.query(FileImage).filter(FileImage.file_id == file_id).delete()
        
        # Then delete the file
        db.delete(file)
        
        # Commit the transaction
        db.commit()
        return {"status": "success"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{file_id}/images", response_model=List[FileImageResponse])
def get_file_images(
    file_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(validate_token)
):
    """Get images extracted from a PDF file"""
    file = db.query(File).filter(
        File.file_id == file_id,
        File.user_id == current_user.user_id
    ).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    images = db.query(FileImage).filter(FileImage.file_id == file_id).all()
    images_list = [
        {
            "image_id": img.image_id,
            "file_id": img.file_id,
            "mime_type": img.mime_type,
            "image_data": base64.b64encode(img.image_data).decode("utf-8")
        } for img in images
    ]
    return JSONResponse(content=images_list) 