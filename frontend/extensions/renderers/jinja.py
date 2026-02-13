from jinja2_simple_tags import StandaloneTag, InclusionTag


class ToolExtension(InclusionTag, StandaloneTag):
    """Jinja extension. Adds tag for cleanly including widgets in content

    Usage: {% tool 'healthInsuranceCalculator' %}

    Arbitrary variables can be added to the context:
    {% tool 'taxCalculator', static=True, year="2025" %}
    """

    tags = {"tool"}
    safe_output = True

    def get_template_names(self, tool_name: str, static: bool = False, **kwargs) -> str:
        return f"_tools/{tool_name}.html"

    def get_context(self, *args, **kwargs):
        return {"static": kwargs.get("static", False)}


class TableOfContentsExtension(InclusionTag, StandaloneTag):
    """Jinja extension. Adds {% tableOfContents %}"""

    tags = {"tableOfContents"}
    safe_output = True

    def get_template_names(self) -> str:
        return "_blocks/tableOfContents.html"
