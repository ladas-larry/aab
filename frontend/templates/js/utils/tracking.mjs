export function getReferrer(){
	const source = localStorage.getItem('referralSource');
	const timestamp = localStorage.getItem('referralDate');

	if(!source || !timestamp) return null;

	const daysAgo = (Date.now() - Number(timestamp) * 1000) / (1000 * 60 * 60 * 24);
	return daysAgo <= 30 ? source : null;
}

// Find the nearest parent H2, H3 or H4 heading in .article-body, return its ID for tracking purposes
export function getNearestHeadingId(el){
	const articleBody = document.querySelector('.article-body');
	if(articleBody && el && articleBody.contains(el)){
		const nearestHeading = Array.from(articleBody.querySelectorAll(':scope > :is(h2,h3,h4)'))
			.findLast(h => el.compareDocumentPosition(h) === Node.DOCUMENT_POSITION_PRECEDING);

		return (nearestHeading && nearestHeading.id) ? `#${nearestHeading.id}` : null;
	}
	return null;
}