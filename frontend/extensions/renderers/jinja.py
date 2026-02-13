from jinja2_simple_tags import StandaloneTag, InclusionTag


class ToolExtension(InclusionTag, StandaloneTag):
    """Jinja extension. Adds tags for cleanly including widgets in content

    Usage: {% calculator 'healthInsurance' %}
    Usage: {% letter 'abmeldungEmail' %}
    Usage: {% form 'anmeldung' %}

    Arbitrary variables can be added to the context:
    {% calculator 'tax', static=True, year="2025" %}
    """

    tags = {"calculator", "letter", "form"}
    safe_output = True

    def get_template_names(self, tool_name: str, static: bool = False, **kwargs) -> str:
        return f"_{self.tag_name}s/{tool_name}.html"

    def get_context(self, *args, **kwargs):
        return {"static": kwargs.get("static", False)}


class TableOfContentsExtension(InclusionTag, StandaloneTag):
    """Jinja extension. Adds {% tableOfContents %}"""

    tags = {"tableOfContents"}
    safe_output = True

    def get_template_names(self) -> str:
        return "_blocks/tableOfContents.html"
