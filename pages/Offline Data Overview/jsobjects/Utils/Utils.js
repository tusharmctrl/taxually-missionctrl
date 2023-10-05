export default {
	onLoad: () => {
		GetDataForOverview.run()
	},
	getDataForDocumentOverview: () => {
		const data = GetDataForOverview.data.data.prod.missionctrl_map_offline_docs_to_country;
		const groupedData = {};
		data.forEach((item) => {
			const documentNameEN = `${item.Document.NameEN}`;
			const countryCode = item.Country.NameEN;
			const type = item.type;
			const documentType = item.Document.type;
			if (!groupedData[documentNameEN]) {
				groupedData[documentNameEN] = {DocumentType: documentType, values: []};
			}
			groupedData[documentNameEN]['values'].push({ CountryCode: countryCode, Type: type });
		});
		const finalResponse = [];
		for (const documentNameEN in groupedData) {
			if (groupedData.hasOwnProperty(documentNameEN)) {
				const countryData = groupedData[documentNameEN]['values'];
				const documentType = groupedData[documentNameEN]["DocumentType"]
				const euData = countryData.filter((data) => data.Type === "EU")
				const nonEuData = countryData.filter((data) => data.Type === "NON-EU")
				euData.length > 0 && finalResponse.push({ DataType: "Document", Type: documentType, Document: documentNameEN, Establishment: "EU", CountryData: euData.map(data => `${data.CountryCode}`).join(", ") });
				nonEuData.length > 0 && finalResponse.push({ DataType: "Document", Type: documentType, Document: documentNameEN, Establishment: "NON-EU", CountryData: nonEuData.map(data => `${data.CountryCode}`).join(", ") });
			}
		}
		return finalResponse;
	}

}