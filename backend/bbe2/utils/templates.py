from jinja2 import Environment, PackageLoader, select_autoescape


def get_templating():
    return Environment(
        loader=PackageLoader("bbe2"),
        autoescape=select_autoescape()
    )
