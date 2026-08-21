#set document(
  title: "{{ personal_info.name }}'s CV",
  author: "{{ personal_info.name }}",
)
#set page(margin: (x: 2cm, y: 2cm))
#set text(font: "Helvetica", size: 10pt)

= {{ personal_info.name }}
{{ personal_info.email | replace("@", "\\@") }} | {{ personal_info.city }}{% for link in personal_info.links %} | #link("{{ link.url }}")[{{ link.url | replace("https://", "") | replace("http://", "") }}]{% endfor %}

#line(length: 100%)

== Experience
{% for exp in experience %}
*{{ exp.title }}* - {{ exp.organization }} \
_{{ exp.date }}_ \
{% for bullet in exp.bullets %}
- {{ bullet }}
{% endfor %}
{% endfor %}
