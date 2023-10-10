export default {
	onLoad: () => {
		GetDataForOverview.run()
	},
	getDataForDocumentOverview: () => {
		const data = GetDataForOverview.data.data.prod.missionctrl_map_offline_docs_to_country;
		const groupedData = {};
		data.forEach((item) => {
			const documentNameEN = item.Document.NameEN;
			const documentId = item.document_type_id;
			const countryCode = item.Country.NameEN;
			const docPOA = item.Document.poa;
			const docSigned = item.Document.signed;
			const docFiling = item.Document.filing;
			const type = item.type;
			const documentType = item.Document.type;
			if (!groupedData[documentId]) {
				groupedData[documentId] = {DocumentName: documentNameEN, poa:docPOA, signed: docSigned, filing: docFiling, DocumentType: documentType, values: []};
			}
			groupedData[documentId]['values'].push({ CountryCode: countryCode, Type: type });
		});
		const finalResponse = [];
		for (const documentId in groupedData) {
			if (groupedData.hasOwnProperty(documentId)) {
				const countryData = groupedData[documentId]['values'];
				const documentType = groupedData[documentId]["DocumentType"];
				const documentName = groupedData[documentId]["DocumentName"]
				const documentPOA = groupedData[documentId]["poa"] ? "YES" : "NO";
				const documentSigned = groupedData[documentId]["signed"] ? "YES" : "NO";
				const documentFiling = groupedData[documentId]["filing"] ? "YES" : "NO";
				const euData = countryData.filter((data) => data.Type === "EU")
				const nonEuData = countryData.filter((data) => data.Type === "NON-EU")
				euData.length > 0 && finalResponse.push({ DataType: "Document", Type: documentType, Document: documentName, Establishment: "EU", POA:documentPOA, Filing: documentFiling, Signed: documentSigned, CountryData: euData.map(data => `${data.CountryCode}`).join(", ") });
				nonEuData.length > 0 && finalResponse.push({ DataType: "Document", Type: documentType, Document: documentName, Establishment: "NON-EU",POA:documentPOA,Filing: documentFiling, Signed: documentSigned, CountryData: nonEuData.map(data => `${data.CountryCode}`).join(", ") });
			}
		}
		return finalResponse;
	},
	getDataForInformationOverview: () => {
		const data = GetDataForOverview.data.data.prod.missionctrl_track_missing_information;
		const groupedData = {};
		data.forEach((item) => {
			const informationName = item.Information.information;
			const informationId = item.information_type_id;
			const countryName = item.Country.NameEN;
			const type = item.type;
			const informationType = item.Information.type;
			if (!groupedData[informationId]) {
				groupedData[informationId] = {InformationName: informationName, InformationType: informationType, values: []};
			}
			groupedData[informationId]['values'].push({ CountryCode: countryName, Type: type });
		});
		const finalResponse = [];
		for (const informationId in groupedData) {
			if (groupedData.hasOwnProperty(informationId)) {
				const countryData = groupedData[informationId]['values'];
				const informationType = groupedData[informationId]["InformationType"];
				const informationName = groupedData[informationId]["InformationName"]
				const euData = countryData.filter((data) => data.Type === "EU")
				const nonEuData = countryData.filter((data) => data.Type === "NON-EU")
				euData.length > 0 && finalResponse.push({ DataType: "Information", Type: informationType, Document: informationName, Establishment: "EU", CountryData: euData.map(data => `${data.CountryCode}`).join(", ") });
				nonEuData.length > 0 && finalResponse.push({ DataType: "Information", Type: informationType, Document: informationName, Establishment: "NON-EU", CountryData: nonEuData.map(data => `${data.CountryCode}`).join(", ") });
			}
		}
		return finalResponse;
	},

}