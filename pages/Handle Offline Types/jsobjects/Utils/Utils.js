export default {
	onLoad: async() => {
		GetCountries.run();
	},
	onEditRow: async() => {
		const {id, NameEN} = OfflineDocs.updatedRow;
		const whereObj = {id: {_eq: id}}
		const setObj = {NameEN: NameEN}
		await UpdateDocumentTypes.run({whereObj, setObj}).then((resp) => resp.data ? showAlert("Doument Data Successfully Updated!", "success") : showAlert("Oh no! Something went wrong", "error"))
		OfflineDocumentTypes.run();
	},
	onUpdateDocumentType: async (id, type) => {
		const whereObj = {id: {_eq: id}}
		const setObj = {type: type}
		await UpdateDocumentTypes.run({whereObj, setObj}).then((resp) => resp.data ? showAlert(`Doument type Successfully Updated to ${type}!`, "success") : showAlert("Oh no! Something went wrong", "error"));
		OfflineDocumentTypes.run();
	},
	onUpdateInformationType: async (id, type) => {
		const whereObj = {id: {_eq: id}}
		const setObj = {type: type}
		await UpdateInformationType.run({whereObj, setObj}).then((resp) => resp.data ? showAlert(`Information type Successfully Updated to ${type}!`, "success") : showAlert("Oh no! Something went wrong", "error"));
		OfflineInformationTypes.run();
	},
	getSelectedCountriesOfDocument: async(id) => {
		if(!GetCountries.isLoading){
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
		}
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
		const object = {NameEN: CreateDocType.data.DocumentName, type: CreateDocType.data.Type, poa: CreateDocType.data.CheckboxGroup1.includes("poa") ? 1 : 0, filing: CreateDocType.data.CheckboxGroup1.includes("filing") ? 1 : 0, signed: CreateDocType.data.CheckboxGroup1.includes("signed") ? 1 : 0};
		console.log(CreateDocType.data)
		await AddOfflineDocument.run({object: object}).then((resp) => resp.data ? showAlert("New Document has been added Successfully!", "success") : showAlert("Something went wrong", "error"))
		OfflineDocumentTypes.run();
		closeModal("CreateNewDocumentType");
	},
	removeDocument: async(id) => {
		await RemoveDocument.run({id:id}).then((resp) => resp.data ? showAlert("Document has been removed!", "success") : showAlert("Something went wrong", "error"))
		OfflineDocumentTypes.run();
	},
	removeInformation: async(id) => {
		await RemoveInformation.run({id:id}).then((resp) => resp.data ? showAlert("Document has been removed!", "success") : showAlert("Something went wrong", "error"))
		OfflineInformationTypes.run();
	},
	addNewInformation: async() => {
		const object = {information: CreateInfoType.data.InformationName, type: CreateInfoType.data.InformationType};
		await AddOfflineInformation.run({object: object}).then((resp) => resp.data ? showAlert("New Information has been added Successfully!", "success") : showAlert("Something went wrong", "error"))
		OfflineInformationTypes.run();
		closeModal("CreateNewInformationType");
	},
	onInformationEditRow: async() => {
		const {id, information} = InformationMatrix.updatedRow;
		const whereObj = {id: {_eq: id}}
		const setObj = {information}
		await UpdateInformationType.run({whereObj, setObj}).then((resp) => resp.data ? showAlert("Information Data Successfully Updated!", "success") : showAlert("Oh no! Something went wrong", "error"))
		OfflineInformationTypes.run();
	},
	getSelectedCountriesOfInformation: async(id) => {
		if(!GetCountries.isLoading){
			storeValue("currentInformationId", id);
			await GetSelectedCountriesOfInfo.run({id: id, type: TypeOfInformation.selectedOptionValue})
			const countries = GetCountries.data.data.prod.Countries;
			const finalResponse = countries.map((country) => {
				if(GetSelectedCountriesOfInfo.data.data.prod.missionctrl_track_missing_information.some((selectedCountry) => selectedCountry.Country.Id === country.Id)) {
					return {Name: country.NameEN, Assigned: true, InformationId:id, CountryId: country.Id}
				} else {
					return {Name: country.NameEN, Assigned: false, InformationId:id, CountryId: country.Id}
				}
			}).sort((a, b) => (a.Assigned === b.Assigned) ? 0 : a.Assigned ? -1 : 1);
			showModal("CountryBindingsToInfoModal")
			return finalResponse;
		}
	},
	updateInformationMatrix: async(informationId, countryId, isAssigned) => {
		if(isAssigned) {
			const whereObject = {country_id: {_eq: countryId}, information_type_id:{_eq: informationId}, type: {_eq: TypeOfInformation.selectedOptionValue}};
			await DeleteOfflineInformation.run({whereObject: whereObject}).then((resp) => resp.data ? showAlert("Removed Assignment Successfully!", "success") : showAlert("Something went wrong", "error"))
		} else {
			const insertObject = {country_id: countryId, information_type_id:informationId, type: TypeOfInformation.selectedOptionValue}
			await InsertOfflineInformation.run({object: insertObject}).then((resp) => resp.data ? showAlert("Added Assignment Successfully!", "success") : showAlert("Something went wrong", "error"))
		}
		Utils.getSelectedCountriesOfInformation(informationId);
	},
	updateAdditionalDocumentData: async(dataType) => {
		const { poa, id, filing, signed } = OfflineDocs.updatedRow
		const whereObj = {id: {_eq: id}}
		if(dataType === "POA") {
			const setObj = {poa: poa ? 1 : 0}
			await UpdateDocumentTypes.run({whereObj, setObj}).then((resp) => resp.data ? showAlert("Doument Successfully Updated!", "success") : showAlert("Oh no! Something went wrong", "error"))
		} else if(dataType === "FILING") {
			const setObj = {filing: filing ? 1 : 0}
			await UpdateDocumentTypes.run({whereObj, setObj}).then((resp) => resp.data ? showAlert("Doument Successfully Updated!", "success") : showAlert("Oh no! Something went wrong", "error"))
		} else if(dataType === "SIGNED") {
			const setObj = {signed: signed ? 1 : 0}
			await UpdateDocumentTypes.run({whereObj, setObj}).then((resp) => resp.data ? showAlert("Doument Successfully Updated!", "success") : showAlert("Oh no! Something went wrong", "error"))
		}
		OfflineDocumentTypes.run();
	}
}