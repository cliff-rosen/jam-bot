# PubMed Date Mapping Specification

This document specifies the complete mapping between PubMed date types, their XML locations, search field tags, and how they are processed in the system.

## Complete Date Mapping Table

| Date Type | Frontend Label | Search Field Tag | XML Location | XML Node Structure Example | Backend Extraction | Article Field | Metadata Field | Frontend Access | Status |
|-----------|----------------|------------------|--------------|----------------------------|-------------------|---------------|----------------|-----------------|--------|
| **Publication** | Publication Date | `DP` | `MedlineCitation/Article/Journal/JournalIssue/PubDate` | `<PubDate><Year>2023</Year><Month>Jan</Month><Day>15</Day></PubDate>` | Complex logic building from year/month/day | `article.pub_date` | `metadata.pub_date` | `metadata.pub_date` | ✅ Working |
| **Completion** | Completion Date | `DCOM` | `MedlineCitation/DateCompleted` | `<DateCompleted><Year>2023</Year><Month>07</Month><Day>15</Day></DateCompleted>` | `_get_date_from_node(date_completed_node)` | `article.comp_date` | `metadata.comp_date` | `metadata.comp_date` | ✅ Working |
| **Revised** | Revised Date | `LR` | `MedlineCitation/DateRevised` | `<DateRevised><Year>2025</Year><Month>07</Month><Day>25</Day></DateRevised>` | `_get_date_from_node(date_revised_node)` | `article.date_revised` | `metadata.date_revised` | `metadata.date_revised` | ✅ Fixed |
| **Entry** | Entry Date | `EDAT` | `PubmedData/History/PubMedPubDate[@PubStatus="entrez"]` | `<PubMedPubDate PubStatus="entrez"><Year>2023</Year><Month>7</Month><Day>12</Day><Hour>6</Hour><Minute>0</Minute></PubMedPubDate>` | `_get_date_from_node(entry_date_node)` - Fixed path | `article.entry_date` | `metadata.entry_date` | `metadata.entry_date` | ✅ Fixed |
| **Article Date** | Article Date | `DEP` | `Article/ArticleDate` or `MedlineCitation/ArticleDate` | `<ArticleDate DateType="Electronic"><Year>2023</Year><Month>06</Month><Day>01</Day></ArticleDate>` | `_get_date_from_node(article_date_node)` - Check both locations | `article.article_date` | `metadata.article_date` | Not used in frontend | ✅ Fixed |

## XML Structure Context

### Typical PubMed XML Structure
```xml
<PubmedArticleSet>
  <PubmedArticle>
    <MedlineCitation Status="Publisher" Owner="NLM">
      <PMID Version="1">40712492</PMID>
      <DateCompleted>
        <Year>2023</Year>
        <Month>07</Month>
        <Day>15</Day>
      </DateCompleted>
      <DateRevised>
        <Year>2025</Year>
        <Month>07</Month>
        <Day>25</Day>
      </DateRevised>
      <Article>
        <Journal>
          <JournalIssue>
            <PubDate>
              <Year>2023</Year>
              <Month>Jan</Month>
              <Day>15</Day>
            </PubDate>
          </JournalIssue>
        </Journal>
        <ArticleDate DateType="Electronic">
          <Year>2023</Year>
          <Month>06</Month>
          <Day>01</Day>
        </ArticleDate>
      </Article>
    </MedlineCitation>
    <PubmedData>
      <History>
        <PubMedPubDate PubStatus="entrez">
          <Year>2023</Year>
          <Month>7</Month>
          <Day>12</Day>
          <Hour>6</Hour>
          <Minute>0</Minute>
        </PubMedPubDate>
      </History>
    </PubmedData>
  </PubmedArticle>
</PubmedArticleSet>
```

## Backend Processing Details

### Date Extraction Function
```python
@staticmethod
def _get_date_from_node(date_node: Optional[ET.Element]) -> str:
    """
    Extracts date from XML node with Year/Month/Day structure
    Returns YYYY-MM-DD format or empty string if invalid
    """
    if date_node is None:
        return ""
    
    year_node = date_node.find(".//Year")
    month_node = date_node.find(".//Month")
    day_node = date_node.find(".//Day")
    
    # Year is required
    if year_node is None or year_node.text is None:
        return ""
    
    year = year_node.text
    month = month_node.text if month_node is not None and month_node.text else "01"
    day = day_node.text if day_node is not None and day_node.text else "01"
    
    # Ensure month and day are zero-padded
    month = month.zfill(2)
    day = day.zfill(2)
    
    return f"{year}-{month}-{day}"
```

### XML Node Selection Logic
```python
# Extract date nodes from XML
date_completed_node = medline_citation_node.find(".//DateCompleted")
date_revised_node = medline_citation_node.find(".//DateRevised")

# ArticleDate can be in Article or directly in MedlineCitation
article_date_node = None
if article_node is not None:
    article_date_node = article_node.find(".//ArticleDate")
if article_date_node is None:
    article_date_node = medline_citation_node.find(".//ArticleDate")

# Entry date is in PubmedData/History/PubMedPubDate with PubStatus="entrez"
pubmed_data_node = pubmed_article_node.find('.//PubmedData')
entry_date_node = None
if pubmed_data_node is not None:
    history_node = pubmed_data_node.find('.//History')
    if history_node is not None:
        entry_date_node = history_node.find('.//PubMedPubDate[@PubStatus="entrez"]')
```

### Search Field Tag Mapping
```python
def _get_date_clause(start_date: str, end_date: str, date_type: str = "publication") -> str:
    """Build PubMed date filter clause based on date type."""
    # Map date types to PubMed E-utilities search field tags
    date_field_map = {
        "completion": "DCOM",  # Date Completed
        "publication": "DP",   # Date of Publication 
        "entry": "EDAT",       # Entry Date (formerly Entrez Date)
        "revised": "LR"        # Date Last Revised
    }
    
    field = date_field_map.get(date_type, "DP")
    clause = f'AND (("{start_date}"[{field}] : "{end_date}"[{field}]))'
    return clause
```

## Frontend Display Logic

### Date Selection and Display
```typescript
const getArticleDate = (article: CanonicalResearchArticle, dateType: string): string => {
  // For non-PubMed articles, always use publication year
  if (article.source !== 'pubmed') {
    return article.publication_year?.toString() || '-';
  }

  // For PubMed articles, check source_metadata for the requested date type
  const metadata = article.source_metadata || {};
  
  switch (dateType) {
    case 'completion':
      return metadata.comp_date || metadata.publication_date || article.publication_year?.toString() || '-';
    case 'entry':
      return metadata.entry_date || metadata.publication_date || article.publication_year?.toString() || '-';
    case 'revised':
      return metadata.date_revised || metadata.publication_date || article.publication_year?.toString() || '-';
    case 'publication':
    default:
      return metadata.pub_date || metadata.publication_date || article.publication_year?.toString() || '-';
  }
};
```

### Date Format Preservation
```typescript
const formatDate = (dateStr: string): string => {
  if (!dateStr || dateStr === '-') return '-';
  
  // If it's just a year, return as-is
  if (/^\d{4}$/.test(dateStr)) return dateStr;
  
  // If it's a full date (YYYY-MM-DD), return the full date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // Try to extract the year from other formats as fallback
  const yearMatch = dateStr.match(/^(\d{4})/);
  if (yearMatch) return yearMatch[1];
  
  return dateStr;
};
```

## Usage Examples

### Searching by Revised Date
1. User selects "Revised Date" from Filter Date Type dropdown
2. Frontend sends `date_type: "revised"` in search parameters
3. Backend builds search clause: `AND ("2023/01/01"[LR] : "2024/12/31"[LR])`
4. PubMed API filters results by Date Last Revised field

### Displaying Revised Date
1. User selects "Revised Date" from Display Date Type dropdown
2. Frontend calls `getArticleDate(article, "revised")`
3. Function returns `metadata.date_revised` (e.g., "2025-07-25")
4. `formatDate()` preserves full date format
5. Table displays "2025-07-25" in the date column

## Key Fixes Applied

1. **Corrected Search Field Tags**: Using official PubMed E-utilities tags (LR, DCOM, DP, EDAT)
2. **Fixed Entry Date Path**: Now correctly looks in `PubmedData/History/PubMedPubDate[@PubStatus="entrez"]`
3. **Enhanced ArticleDate Extraction**: Checks both `Article/ArticleDate` and `MedlineCitation/ArticleDate` locations
4. **Preserved Full Date Format**: Frontend no longer strips dates to just year
5. **Added Comprehensive Logging**: Debug output traces each step of date extraction

## Testing Verification

To verify the mapping works correctly:

1. Search PubMed with "revised" date filter and "revised" display date
2. Check server logs for debug output showing extracted dates
3. Verify table shows full YYYY-MM-DD format (e.g., "2025-07-25")
4. Confirm search results are filtered by the DateRevised field using [LR] tag

Expected result for the provided XML example:
- **Filter**: Uses `[LR]` field tag
- **Extract**: `date_revised = "2025-07-25"`
- **Display**: Shows "2025-07-25" in table