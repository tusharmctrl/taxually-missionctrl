export default {
	onLoad: async() => {
		GetCountries.run();
	},
	onEditRow: async() => {
		const {id, NameEN} = Table1.updatedRow;
		await UpdateDocumentTypes.run({id: id, name: NameEN}).then((resp) => resp.data ? showAlert("Doument Data Successfully Updated!", "success") : showAlert("Oh no! Something went wrong", "error"))
		OfflineDocumentTypes.run();
	},
	getSelectedCountriesOfDocument: async(id) => {
		storeValue("currentDocumentId", id);
		await GetSelectedCountriesOfDocument.run({id: id, type: Select1.selectedOptionValue})
		const countries = GetCountries.data.data.prod.Countries;
		const finalResponse = countries.map((country) => {
			if(GetSelectedCountriesOfDocument.data.data.prod.missionctrl_map_offline_docs_to_country.some((selectedCountry) => selectedCountry.Country.Id === country.Id)) {
				return {Name: country.NameEN, Assigned: true, DocumentId:id, CountryId: country.Id}
			} else {
				return {Name: country.NameEN, Assigned: false, DocumentId:id, CountryId: country.Id}
			}
		}).sort((a, b) => (a.Assigned === b.Assigned) ? 0 : a.Assigned ? -1 : 1);
		showModal("CountryBindingsModal")
		return finalResponse;
	},
	updateDocumentInformation: async(documentId, countryId, isAssigned) => {
		if(isAssigned) {
			const whereObject = {country_id: {_eq: countryId}, document_type_id:{_eq: documentId}, type: {_eq: Select1.selectedOptionValue}};
			await DeleteOfflineDocument.run({whereObject: whereObject}).then((resp) => resp.data ? showAlert("Removed Successfully!", "success") : showAlert("Something went wrong", "error"))
		} else {
			const insertObject = {country_id: countryId, document_type_id:documentId, type: Select1.selectedOptionValue}
			await InsertOfflineDocument.run({object: insertObject}).then((resp) => resp.data ? showAlert("Added Successfully!", "success") : showAlert("Something went wrong", "error"))
		}
		Utils.getSelectedCountriesOfDocument(documentId);
	},
	addNewDocument: async() => {
		const object = {NameEN: CreateDocType.data.DocumentName, type: CreateDocType.data.Type};
		await AddOfflineDocument.run({object: object}).then((resp) => resp.data ? showAlert("New Document has been added Successfully!", "success") : showAlert("Something went wrong", "error"))
		OfflineDocumentTypes.run();
		CreateNewDocumentType.isVisible = false;
	},
	removeDocument: async(id) => {
		await RemoveDocument.run({id:id}).then((resp) => resp.data ? showAlert("Document has been removed!", "success") : showAlert("Something went wrong", "error"))
		OfflineDocumentTypes.run();
	}
}