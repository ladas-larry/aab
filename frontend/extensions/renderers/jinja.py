from jinja2_simple_tags import StandaloneTag, InclusionTag
from ursus.config import config
import xml.etree.ElementTree as ET


class ToolExtension(StandaloneTag):
    """Jinja extension. Adds tag for cleanly including Vue widgets in markdown.
    Usage: {% tool "health-insurance-calculator", initial_occupation="hello", static=True %}

    Outputs <health-insurance-calculator initial-occupation="hello" static="static" v-cloak></health-insurance-calculator>

    Also queues the Javascript to load the Vue component from /js/tools/health-insurance-calculator.mjs
    """

    tags = {"tool"}
    safe_output = True

    def render(self, html_tag: str, **kwargs):
        js_path = f"js/vue/tools/{html_tag}.mjs"
        abs_js_path = config.templates_path / js_path
        assert abs_js_path.exists(), f"Component <{html_tag}> does not exist at {abs_js_path}"

        js_class = "".join(word.title() for word in html_tag.split("-"))

        # js_fragments are output only once by {% alljs %}
        self.environment.js_fragments.add("import Vue from '/js/vue/vue.mjs';")
        self.environment.js_fragments.add(f"""
            import {js_class} from '/{js_path}';
            document.querySelectorAll('{html_tag}').forEach(el => new Vue({{
                el,
                components: {{
                    '{html_tag}': {js_class},
                }},
            }}));
        """)

        html_attrs = {
            "v-cloak": "",
        }
        for attr, value in kwargs.items():
            attr = attr.replace("_", "-")
            if value is True:
                # For example, disabled="disabled"
                html_attrs[attr] = attr
            elif value is False:
                continue
            else:
                html_attrs[attr] = value

        html_element = ET.Element(html_tag, html_attrs)
        noscript = ET.SubElement(html_element, "noscript")
        noscript.text = "This tool requires JavaScript."
        return ET.tostring(html_element, short_empty_elements=False).decode()

    def get_context(self, *args, **kwargs):
        return kwargs


class TableOfContentsExtension(InclusionTag, StandaloneTag):
    """Jinja extension. Adds {% tableOfContents %}"""

    tags = {"tableOfContents"}
    safe_output = True

    def get_template_names(self) -> str:
        return "_blocks/tableOfContents.html"
