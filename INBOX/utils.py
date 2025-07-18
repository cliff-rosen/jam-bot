

def get_score_from_features(article):

    poi_relevance = article['poi'].upper()
    doi_relevance = article['doi'].upper()
    is_systematic = article['is_systematic'].upper()
    study_type = article['study_type']
    study_outcome = article['study_outcome']

    # Check if PoI and DoI are both 'YES'
    if poi_relevance == "YES" and doi_relevance == "YES":
        if "effectiveness" in study_outcome:
            if study_type == "human RCT":
                return 10
            else:
                return 9
        elif "safety" in study_outcome:
            return 8
        elif "diagnostics" in study_outcome:
            if is_systematic == 'YES':
                return 7
            else:
                return 6
        elif is_systematic == 'YES':
            return 3
        else:
            return 2

    # Check if PoI is 'NO' and DoI is 'YES'
    elif poi_relevance == "NO" and doi_relevance == "YES":
        if "effectiveness" in study_outcome or "safety" in study_outcome:
            if study_type in ["human RCT", "human non-RCT"]:
                if is_systematic == "YES":
                    return 5
                else:
                    return 4
            else:
                return 3
        elif "diagnostics" in study_outcome:
            if study_type in ["human RCT", "human non-RCT"]:
                return 4
            else:
                return 3
        else:
            return 2

    # Check if PoI is 'YES' and DoI is 'No'
    elif poi_relevance == "YES" and doi_relevance == "NO":
        if ("effectiveness" in study_outcome or "safety" in study_outcome):
            if study_type == "human RCT":
                return 7
            if is_systematic == "YES":
                return 6
            return 5
        elif "diagnostics" in study_outcome:
            if is_systematic == "YES":
                return 4
            else:
                return 3
        else:
            return 2

    # Default score if none of the conditions are met
    return 0

# poi_relevance, doi_relevance, is_systematic, study_type, study_outcomes
features_list = [
    ["YES", "YES", "YES", "human RCT", ["efficacy"]],  # Score 10
    ["YES", "YES", "YES", "non-human RCT", ["efficacy"]],  # Score 9
    ["YES", "YES", "YES", "any study type", ["safety"]],  # Score 8
    ["YES", "YES", "YES", "any study type", ["diagnostics"]],  # Score 7 
    ["YES", "YES", "NO", "any study type", ["diagnostics"]],  # Score 6
    ["YES", "YES", "YES", "any study type", []],  # Score 3
    ["YES", "YES", "NO", "any study type", []],  # Score 2

    ["NO", "YES", "YES", "human RCT", ["efficacy"]],  # Score 5
    ["NO", "YES", "NO", "human RCT", ["efficacy"]],  # Score 4
    ["NO", "YES", "YES", "animal", ["efficacy"]],  # Score 3
    ["NO", "YES", "YES", "human RCT", ["diagnostics"]],  # Score 4
    ["NO", "YES", "YES", "animal", ["diagnostics"]],  # Score 3
    ["NO", "YES", "YES", "animal", []],  # Score 2

    ["YES", "NO", "YES", "human RCT", ["efficacy", "safety"]],  # Score 7
    ["YES", "NO", "YES", "animal", ["efficacy", "safety"]],  # Score 6
    ["YES", "NO", "NO", "animal", ["efficacy", "safety"]],  # Score 5
    ["YES", "NO", "YES", "animal", ["diagnostics"]],  # Score 4
    ["YES", "NO", "NO", "animal", ["diagnostics"]],  # Score 3
    ["YES", "NO", "NO", "animal", []],  # Score 2

    ["NO", "NO", "NO", "any study type", []],  # Default Score 0
]

scores = [10,9,8,7,6,3,2, 5,4,3,4,3,2, 7,6,5,4,3,2, 0]

def test():
    for i in range(len(features_list)):
        print(get_score_from_features(features_list[i]), scores[i])

#test()
#print(feature)
#print(get_score_from_features(feature))
