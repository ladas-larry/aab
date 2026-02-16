{% js %}
import { getCurrencyTooltipText } from '/js/utils/exchangeRates.mjs';
import { validateForm } from '/js/utils/forms.mjs';

window.addEventListener("DOMContentLoaded", function() {
	/* Fixes align-items: baseline bug in Safari */
	// TODO: Remove
	document.querySelectorAll('input, textarea').forEach((input) => {
		input.placeholder = input.placeholder || ' ';
	});

	/* Currency conversion tooltips */
	document.querySelectorAll('.currency').forEach(element => {
		getCurrencyTooltipText(element.textContent).then(text => {
			if(text) {
				element.dataset.currencies = text;
			};
		});
	})

	/* Reviewers */
	document.querySelectorAll('.post-reviewers a').forEach(link => {
		link.addEventListener('click', (e) => {
			e.preventDefault();
			link.classList.toggle('expanded');
			document.getElementById('reviewers').classList.toggle('hidden');
		});
	});

	/* Checklists */
	document.querySelectorAll('li.checkbox').forEach(checklistItem => {
		checklistItem.addEventListener('click', (e) => {
			if(
				e.target.tagName !== 'A'
				&& e.target.tagName !== 'INPUT'
				&& (e.target.parentElement && e.target.parentElement.tagName) !== 'A'
			){
				const checkbox = checklistItem.querySelector('[type=checkbox]');
				checkbox.checked = !checkbox.checked;
				e.stopPropagation();
			}
		});
	});

	/* Open footnotes when clicking on a footnote link */
	document.querySelectorAll('.footnote-ref').forEach(link => {
		link.addEventListener('click', e => {
			document.getElementById('footnotes').setAttribute("open", "true");
		});
	});

	/* Expandable lists */
	document.querySelectorAll(".table-of-contents .expand").forEach(expandButton => {
		expandButton.addEventListener('click', e => {
			e.preventDefault();
			expandButton.parentNode.classList.toggle('expanded');
		})
	});
});
{% endjs %}