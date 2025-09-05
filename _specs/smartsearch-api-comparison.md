# SmartSearch API Comparison: SmartSearchAPI vs SmartSearch2API

This document compares the two SmartSearch API clients, showing how each frontend API method calls backend endpoints and services.

## SmartSearchAPI (smartSearchApi.ts)

| API Method | Endpoint Called | Router Method | Services Called |
|------------|----------------|---------------|-----------------|
| `executeSearch()` | `POST /api/lab/smart-search/execute` | `execute_search()` | `SmartSearchService.execute_search_with_session()` |
| `createEvidenceSpecification()` | `POST /api/lab/smart-search/create-evidence-spec` | `create_evidence_specification()` | `SmartSearchSessionService.get_or_create_session()`, `SmartSearchService.create_evidence_specification()`, `SmartSearchSessionService.update_evidence_spec_step()` |
| `generateSearchKeywords()` | `POST /api/lab/smart-search/generate-search-keywords` | `generate_keywords()` | `SmartSearchSessionService.get_session()`, `SmartSearchService.generate_search_keywords()`, `SmartSearchSessionService.update_search_keywords_step()` |
| `testKeywordsCount()` | `POST /api/lab/smart-search/test-keywords-count` | `test_keywords_count()` | `SmartSearchSessionService.get_session()`, `SmartSearchService.get_search_count()` |
| `generateOptimizedKeywords()` | `POST /api/lab/smart-search/generate-optimized-keywords` | `generate_optimized_keywords()` | `SmartSearchSessionService.get_session()`, `SmartSearchService.generate_optimized_search_query()`, `SmartSearchSessionService.update_search_keywords_step()` |
| `generateDiscriminator()` | `POST /api/lab/smart-search/generate-discriminator` | `generate_discriminator()` | `SmartSearchSessionService.get_session()`, `SmartSearchService.generate_semantic_discriminator()`, `SmartSearchSessionService.update_discriminator_step()` |
| `filterArticles()` | `POST /api/lab/smart-search/filter-articles` | `filter_articles()` | `SmartSearchSessionService.get_session()`, `SmartSearchService.execute_filtering_workflow()` |
| `extractFeatures()` | `POST /api/lab/smart-search/extract-features` | `extract_features()` | `SmartSearchSessionService.get_session()`, `SmartSearchService.extract_features_parallel()`, `SmartSearchSessionService.update_custom_columns_and_features()` |
| `resetSessionToStep()` | `POST /api/lab/smart-search/sessions/{sessionId}/reset-to-step` | `reset_session_to_step()` | `SmartSearchSessionService.reset_to_step()` |
| `getUserSessions()` | `GET /api/lab/smart-search/sessions` | `get_search_sessions()` | `SmartSearchSessionService.get_user_sessions()` |
| `getAllSessions()` | `GET /api/lab/smart-search/admin/sessions` | `get_all_search_sessions()` | `SmartSearchSessionService.get_all_sessions()` |
| `getSession()` | `GET /api/lab/smart-search/sessions/{sessionId}` | `get_search_session()` | `SmartSearchSessionService.get_session()` |
| `deleteSession()` | `DELETE /api/lab/smart-search/sessions/{sessionId}` | `delete_search_session()` | `SmartSearchSessionService.get_session()` |
| `updateSearchKeywordHistory()` | `PUT /api/lab/smart-search/sessions/{sessionId}/search-keyword-history` | `update_search_keyword_history()` | `SmartSearchSessionService.update_search_keyword_history()` |

## SmartSearch2API (smartSearch2Api.ts)

| API Method | Endpoint Called | Router Method | Services Called |
|------------|----------------|---------------|-----------------|
| `search()` | `POST /api/smart-search-2/search` | `direct_search()` | `SmartSearchService.search_articles()` |
| `searchGet()` | `GET /api/smart-search-2/search` | `direct_search_get()` | `SmartSearchService.search_articles()` (via `direct_search()`) |
| `createEvidenceSpecification()` | `POST /api/smart-search-2/evidence-specification` | `create_evidence_specification()` | `SmartSearchService.create_evidence_specification()` |
| `generateKeywords()` | `POST /api/smart-search-2/generate-keywords` | `generate_search_keywords()` | `SmartSearchService.generate_search_keywords()` |

## Key Differences

| Aspect | SmartSearchAPI | SmartSearch2API |
|--------|----------------|-----------------|
| **Number of Methods** | 14 methods | 4 methods |
| **Session Management** | Extensive session tracking with `SmartSearchSessionService` | No session management |
| **Complexity** | Multi-step workflow with state persistence | Simple, direct operations |
| **Service Dependencies** | Both `SmartSearchService` and `SmartSearchSessionService` | Only `SmartSearchService` |