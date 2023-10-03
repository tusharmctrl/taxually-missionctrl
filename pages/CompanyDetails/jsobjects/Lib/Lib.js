export default {
	makeTable: (rows) => {
		let html = `<table>`

		rows.map(({title, value}) => {
			html += `<tr><th>${title}:  </th><td>${value}</td></tr>`
		})
		html += `</table>`
		return html
	},
	isCharacterUpperCase(string) {
		return string.toUpperCase() === string;
	},
	convertToCamelCase(inputString) {
		const words = inputString.split(' ');
		const camelCaseString = words.map(word => {
			return word.charAt(0).toUpperCase() + word.slice(1);
		}).join('');
		return camelCaseString;
	}
}