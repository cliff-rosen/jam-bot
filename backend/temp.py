prompt = MissionDefinitionPrompt()

formatted_messages = prompt.get_formatted_messages(
    messages=state.messages,
    mission=state.mission,
)




tool_descriptions = self._format_tool_descriptions_with_external_systems()
assets_str = format_assets(available_assets)
mission_str = format_mission(mission_dict)		


langchain_messages = format_langchain_messages(messages)

format_instructions = self.parser.get_format_instructions()

prompt = self.get_prompt_template()
formatted_messages = prompt.format_messages(
    tool_descriptions=tool_descriptions,
    mission=mission_str,
    messages=langchain_messages,
    available_assets=assets_str,
    format_instructions=format_instructions
)

format_messages_for_openai(formatted_messages)



prompt.format_messages()

self._format_tool_descriptions_with_external_systems()
self.parser.get_format_instructions()
self.get_prompt_template()

format_assets(available_assets)
format_mission(mission_dict)		
format_langchain_messages(messages)
format_messages_for_openai(formatted_messages)
    
