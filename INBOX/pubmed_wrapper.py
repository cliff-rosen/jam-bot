import requests
import xml.etree.ElementTree as ET
import urllib.parse

"""
DOCS
https://www.ncbi.nlm.nih.gov/books/NBK25501/
https://www.ncbi.nlm.nih.gov/books/NBK25499/

SAMPLE CALLS
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=%28%28melanocortin%29%20OR%20%28natriuretic%29%20OR%20%28Dry%20eye%29%20OR%20%28Ulcerative%20colitis%29%20OR%20%28Crohn%E2%80%99s%20disease%29%20OR%20%28Retinopathy%29%20OR%20%28Retinal%20disease%29%29AND%20%28%28%222023/11/01%3E%22%5BDate%20-%20Completion%5D%20%3A%20%222023/11/30%22%5BDate%20-%20Completion%5D%29%29&retmax=10000&retmode=json
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=38004229&retmode=xml

"""
PUBMED_API_SEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PUBMED_API_FETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
RETMAX = "10000"

class Article():
    """
    PubmedArticle
        MedlineCitation
            PMID
            Article (PubModel)
                Journal
                    JournalIssue (CitedMedium)
                        Volume
                        Issue
                        PubDate
                    Title
                ArticleTitle
                Pagination
                Abstract
                AuthorList

    """

    @classmethod
    def from_xml(self, article_xml):
        pubmed_article_node = ET.fromstring(article_xml)
        medline_citation_node = pubmed_article_node.find('.//MedlineCitation')

        PMID_node = medline_citation_node.find(".//PMID")
        article_node = medline_citation_node.find('.//Article')
        date_completed_node = medline_citation_node.find(".//DateCompleted")

        journal_node = article_node.find('.//Journal')
        journal_issue_node = journal_node.find(".//JournalIssue")
        journal_title_node = journal_node.find(".//Title")
        volume_node = journal_issue_node.find(".//Volume")
        issue_node = journal_issue_node.find(".//Issue")
        pubdate_node = journal_issue_node.find(".//PubDate")
        year_node = pubdate_node.find(".//Year")

        article_title_node = medline_citation_node.find(".//ArticleTitle")
        pagination_node = medline_citation_node.find('.//Pagination/MedlinePgn')
        abstract_node = medline_citation_node.find(".//Abstract")
        author_list_node = medline_citation_node.find('.//AuthorList')

        PMID = ""
        title = ""
        journal = ""
        medium = ""
        year = ""
        month = ""
        day = ""
        volume = ""
        issue = ""
        pages = ""           
        date_completed = ""

        if PMID_node is not None:
            PMID = PMID_node.text
        print(PMID)
        if article_title_node is not None:
            title = ''.join(article_title_node.itertext())
        if journal_title_node is not None:
            journal = journal_title_node.text
        if journal_issue_node is not None:
            medium = journal_issue_node.attrib['CitedMedium']
        if year_node is not None:
            year = year_node.text
        if volume_node is not None:
            volume = volume_node.text
        if issue_node is not None:
            issue = issue_node.text
        if pagination_node is not None:
            pages = pagination_node.text
        date_completed = self._get_date_from_node(date_completed_node)

        MAX_AUTHOR_COUNT = 3
        author_list = []
        author_node_list = []
        if author_list_node is not None:
            author_node_list = author_list_node.findall('.//Author')
        for author_node in author_node_list[0:3]:
            last_name_node = author_node.find('.//LastName')
            if  last_name_node is not None:
                last_name = last_name_node.text
                initials_node = author_node.find('.//Initials')
                if initials_node is not None:
                    initials = initials_node.text
                else:
                    initials = ""
                author_list.append(f"{last_name} {initials}")
        authors = ', '.join(author_list)
        if len(author_node_list) > MAX_AUTHOR_COUNT:
            authors += ', et al'

        abstract = ""
        if abstract_node is not None:
            abstract_texts = abstract_node.findall('.//AbstractText')
            if abstract_texts is not None and len(abstract_texts) > 0:
                for abstract_text in abstract_texts:
                    abstract += ''.join(abstract_text.itertext())

        citation = f"{authors} {title} {journal}. {year};{volume}({issue}):{pages}."

        return Article(
                    PMID=PMID,
                    comp_date=date_completed,
                    title=title,
                    abstract=abstract,
                    authors=authors,
                    journal=journal,
                    medium=medium,
                    year=year,
                    volume=volume,
                    issue=issue,
                    pages=pages
                    )

    def __init__(self, **kwargs):
        #print(kwargs)
        self.PMID = kwargs['PMID']
        self.comp_date = kwargs['comp_date']
        self.title = kwargs['title']
        self.abstract = kwargs['abstract']
        self.authors = kwargs['authors']
        self.journal = kwargs['journal']
        self.year = kwargs['year']
        self.volume = kwargs['volume']
        self.issue = kwargs['issue']
        self.pages = kwargs['pages']
        self.medium = kwargs['medium']

    def __str__(self):
        line = "===================================================\n"        
        res = "PMID: " + self.PMID + '\n' \
            + "Comp date: " + self.comp_date + '\n' \
            + "Title: " + self.title[0:80] + '\n' \
            + "Abstract: " + self.abstract[0:80] + '\n' \
            + "Authors: " + self.authors[0:80] + '\n' \
            + 'Journal: ' + self.journal[0:80] + '\n' \
            + 'Year: ' + self.year + '\n' \
            + 'Volume: ' + self.volume + '\n' \
            + 'Issue: ' + self.issue + '\n' \
            + 'Medium: ' + self.medium
        
        return line + res

    def _get_date_from_node(date_completed_node):
        if date_completed_node is None:
            return ""
        year_node = date_completed_node.find(".//Year")
        month_node = date_completed_node.find(".//Month")
        day_node = date_completed_node.find(".//Day")
        year = year_node.text
        if month_node is not None:
            month = month_node.text
        else:
            month = "01"
        if day_node is not None:
            day = day_node.text
        else:
            day = "01"
        return year + "-" + month + "-" + day


def _get_date_clause(start_date, end_date):
    clause = 'AND (("<sdate>"[Date - Completion] : "<edate>"[Date - Completion]))'
    clause = clause.replace("<sdate", start_date)
    clause = clause.replace("<edate>", end_date)
    return clause


def _get_date(article):
    pub_date = article.find(".//DateCompleted")
    year = pub_date.find("Year").text
    month_x = pub_date.find("Month")
    month = month_x.text if month_x is not None else '?'
    day_x = pub_date.find("Day")
    day = day_x.text if day_x is not None else '?'
    comp_date = f"{year}-{month}-{day}"
    return comp_date


def get_article_ids_by_date_range(filter_term, start_date, end_date):
    url = PUBMED_API_SEARCH_URL
    params = {
        'db': 'pubmed',
        'term': '(' + filter_term + ')' + _get_date_clause(start_date, end_date),
        'retmax': RETMAX,
        'retmode': 'json'
    }
    print(url)
    print('about to retrieve ids')
    response = requests.get(url, params)
    content = response.json()
    count = content['esearchresult']['count']
    ids = content['esearchresult']['idlist']

    return ({'status_code': response.status_code, 
             'count': count,
             'ids': ids})


def get_articles_from_ids(ids):
    articles = []
    batch_size = 100
    low = 0
    high = low + 100

    while low < len(ids):
        print(f"processing {low} to {high}")
        id_batch = ids[low: high]
        url = PUBMED_API_FETCH_URL
        params = {
            'db': 'pubmed',
            'id': ','.join(id_batch)
        }
        xml = ""
        try:
            response = requests.get(url, params)
            response.raise_for_status()
            xml = response.text
        except Exception as e:
            print("Error: ", e)

        root = ET.fromstring(xml)
        for article_node in root.findall(".//PubmedArticle"):
            articles.append(Article.from_xml(ET.tostring(article_node)))

        low += batch_size
        high += batch_size

    return articles


def get_citation_from_article(article):
    pmid = article.find(".//PMID").text
    print('pmid: ', pmid)
    title = article.find(".//ArticleTitle").text
    journal = article.find(".//Journal/Title").text
    year = article.find(".//Journal/JournalIssue/PubDate/Year").text
    volume = "x" # article.find(".//Journal/JournalIssue/PubDate/Volume").text
    issue = "x" # article.find(".//Journal/JournalIssue/PubDate/Issue").text
    pages = "x" # article.find("MedlinePgn").text
    authors_list = article.find(".//AuthorList")
    authors = ', '.join([f"{a['LastName']} {a['ForeName'][0]}." for a in authors_list])
    print('------------------------')
    print(authors_list)
    print('------------------------')
    citation = f"{authors} {title}. {journal}. {year};{volume}({issue}):{pages}."

    return citation



"""
url = PUBMED_API_SEARCH_URL \
    + '?db=pubmed' \
    + '&term=' + FILTER_TERM \
    + '&datetype=pdat' \
    + '&mindate=' + start_date \
    + '&maxdate=' + end_date \
    + '&retmax=' + RETMAX \
    + '&retmode=json'

article_dict = {
        'PMID': pmid,
        'Comp_Date': f"{year}-{month}-{day}",
        'Title': title,
        'Abstract': abstract
    }
"""
