export default {
	selectedCompanyId: () => {
		return parseInt(appsmith.URL.queryParams.companyId)
	},
	selectedCountryId: () => {
		return appsmith.URL.queryParams.countryId
	},
	selectedCompany: () => Company.data?.data?.prod?.Companies_by_pk,
	getValidTokenFromDB: () => {
		const [token] = GetTokenFromDB.data.data.prod.missionctrl_azure_tokens;
		const decodeToken = atob(token.token);
		return decodeToken;
	},
	getMissingInformation: () => {
		const requiredInformation = GetEssentialDataForInfoAndDocs.data.data.prod.missionctrl_track_missing_information;
		const submittedInformation = CheckManuallyUpdatedInfo.data.data.prod.missionctrl_track_remaining_data_information;
		const finalInformation = [];
		requiredInformation.filter((information) => {
			const hasAlreadyBeenAdded = submittedInformation.find((info) => info.information_type_id === information.Information.id && info.country_id === information.Country.Id && info.value);
			if(hasAlreadyBeenAdded) {
				finalInformation.push({ name: information.Information.information, jurisdiction_country:information.Country.NameEN, jurisdiction_country_id: information.Country.Id, information_id: information.Information.id, missing: false, Value: hasAlreadyBeenAdded.value })
			} else {
				finalInformation.push({name: information.Information.information, jurisdiction_country:information.Country.NameEN, jurisdiction_country_id: information.Country.Id, information_id: information.Information.id, missing: true, Value: ""  })
			}
		})
		return finalInformation
	},
	necessaryThingsToRunOnLoad: async() => {
		if (appsmith.URL.queryParams.companyId) {
			const companyId = parseInt(appsmith.URL.queryParams.companyId);
			const companyTask = Company.run({ company_id: companyId });
			const jurisdictionsTask = companyTask.then(() => {
				const jurisdictions = Company.data.data.prod.Companies_by_pk.current_orders;
				return jurisdictions.map(jurisdiction => jurisdiction.country.Id);
			});
			Promise.all([companyTask, jurisdictionsTask]).then(([_, jurisdictioncountryIds]) => {
				const type = Company.data.data.prod.Companies_by_pk.Country.EuVatArea ? "EU" : "NON-EU";
				const companyType = Company.data.data.prod.Companies_by_pk.LegalStatus.NameEN === "Company" ? "COMPANY" : "INDIVIDUAL";
				return GetEssentialDataForInfoAndDocs.run({ countryIds: jurisdictioncountryIds, type, companyType:companyType });
			});
			CheckManuallyUpdatedDocs.run();
			CheckManuallyUpdatedInfo.run();
			GetTokenFromDB.run();
			QuestionnaireAPI.run();
			AdditionalInformation.run();
			DocumentAPI.run();
		} else {
			navigateTo("Companies");
		}
	},
	refreshPage: async () => {
		Utils.necessaryThingsToRunOnLoad();
		Utils.getMissingInformation();
		Utils.getMissingOfflineDocuments()
	},
	companyInfoTable: () => {
		const company = Company.data?.data.prod.Companies_by_pk
		if (!!!company) {
			return ""
		}
		return Lib.makeTable([
			{title: "Company ID", value: company.Id || "None"},
			{title: "Legal Status", value: company.LegalStatus.NameEN || "None"},
			{title: "Subscription Date", value: company.SubscriptionDate || "-"},
			{title: "EU country?", value: Company.data.data.prod.Companies_by_pk.Country.EuVatArea ? "YES" : "NO" || "-"},
			{title: "Established Country ", value: `${company.EstablishedCountry.Code} - ${company.EstablishedCountry.NameEN} `  || "-"},
			{title: "Status Details", value: `${company.status_detail.name} | ${company.status_detail.tracker_status} `  || "-"},
			{title: "Current Status", value: Select1.selectedOptionLabel}
		])
	},
	getAllCompanyJurisdiction: () => {
		const jurisdictions = Company.data.data.prod.Companies_by_pk.current_orders;
		const statusOfJurisdiction = Company.data.data.prod.missionctrl_track_jurisdiction_status;
		const currentCompanyId = parseInt(Utils.selectedCompanyId());
		const jurisdictionsValue = jurisdictions.map((jurisdiction) => {
			if(statusOfJurisdiction.some((trackedJurisdiction) => trackedJurisdiction.country_id === jurisdiction.country.Id && trackedJurisdiction.company_id === currentCompanyId )){
				return {
					name: `${jurisdiction.status.name} - ${jurisdiction.country.NameEN} - ${jurisdiction.country.Code}`,
					countryId: jurisdiction.country.Id,
					isReady: true
				}
			} else {
				return {
					name: `${jurisdiction.status.name} - ${jurisdiction.country.NameEN} - ${jurisdiction.country.Code}`,
					countryId: jurisdiction.country.Id,
					isReady: false
				}
			}
		})
		return jurisdictionsValue;
	},
	getHistoryOfInformation: async(informationType, country_id) => {
		await GetHistoryOfInformation.run({company_id:parseInt(appsmith.URL.queryParams.companyId), information_id: informationType, country_id: country_id })
		showModal("HistoryOfInformation")
	},
	statusLookup: () => {
		return GetAllStatuses.data.data.prod.missionctrl_track_companies_by_status.map(l => {
			return {value: l.id, label: l.name }
		})
	},
	updateMeaningFulDataToQuestionnaire: (value, name) => {
		const updatedFieldName = Const.meaningfulNamesOfQuestionnaireData(name);
		if(value !== undefined && value !== null && value !== '') {
			switch(name){
				case "LegalRepresentative_Gender":
					return {fieldName: updatedFieldName, isMissing: false, value: Const.genders[value]}
					break;
				case "LegalRepresentative_Position":
					return {fieldName: updatedFieldName, isMissing: false, value: Const.position[value]}
					break;
				case "CountryOfIncorporation":
				case "LegalRepresentative_Nationality":
				case "LegalRepresentative_CountryOfBirth":
					return {fieldName: updatedFieldName, isMissing: false, value: Const.getCountryName(value)}
					break;
				case "LegalRepresentative_IsPoliticallyExposed":
				case "LegalRepresentative_OthersOwnsMoreThan25Percent":
				case "LegalRepresentative_OwnsMoreThan25Percent":
				case "NeedEarlierVatReg":
					return {fieldName: updatedFieldName, isMissing: false, value: Const.boolean[value]}
					break;
				default:
					console.log("Couldn't match")
			}
		}
		else {
			return undefined;
		}
	},
	getMissingQuestionnaireInformation: () => {
		const questionnaireDataOfClient = QuestionnaireAPI.data;
		const dataFields = Object.values(questionnaireDataOfClient).flatMap(group => group.map(field => ({ name: field.name, value: field.value })));
		const finalDataToShowInTable = [];
		const fieldsThatNeedUpdatedValues = ["LegalRepresentative_Position", "LegalRepresentative_Gender", "CountryOfIncorporation", "LegalRepresentative_IsPoliticallyExposed","LegalRepresentative_OthersOwnsMoreThan25Percent", "LegalRepresentative_OwnsMoreThan25Percent", "LegalRepresentative_Nationality", "LegalRepresentative_CountryOfBirth", "NeedEarlierVatReg"]
		if(Company.data.data.prod.Companies_by_pk.LegalStatus.NameEN === "Individual") {
			finalDataToShowInTable.push({
				fieldName: "Incorporation Date",
				value: Company.data.data.prod.Companies_by_pk.IncorporationDate || "",
				isMissing: !Company.data.data.prod.Companies_by_pk.IncorporationDate,
			});

			finalDataToShowInTable.push({
				fieldName: "Incorporation Number",
				value: Company.data.data.prod.Companies_by_pk.IncorporationNumber || "",
				isMissing: !Company.data.data.prod.Companies_by_pk.IncorporationNumber,
			});

			finalDataToShowInTable.push({
				fieldName: "Legal Name of Business",
				value: Company.data.data.prod.Companies_by_pk.LegalNameOfBusiness || "",
				isMissing: !Company.data.data.prod.Companies_by_pk.LegalNameOfBusiness,
			});

			finalDataToShowInTable.push({
				fieldName: "What is your legal status",
				value: Company.data.data.prod.Companies_by_pk.LegalStatus?.NameEN || "",
				isMissing: !Company.data.data.prod.Companies_by_pk.LegalStatus,
			});
		}
		dataFields.forEach((field) => {
			if (field) {
				if (Array.isArray(field.value)) {
					if(field.name === "VATNumbers") {
						if (field.value.length > 0) {
							const selectedCountries = [];
							field.value.forEach((value) => {
								selectedCountries.push(value.countryCode);
								const vatNumberValue = `VAT Number - ${value.vatNumber} - Date ${new Date(value.validFrom).toLocaleDateString()} Frequency - ${Const.getFrequencyName(value.frequency)}`;
								finalDataToShowInTable.push({
									fieldName: value.countryCode === "EU" ? "EU Vat ID" : `VAT Number ${value.countryCode}`,
									value: vatNumberValue,
									isMissing: false,
								});
							});
							finalDataToShowInTable.push({
								fieldName: "Countries where you need our service",
								value: selectedCountries.join(", "),
								isMissing: selectedCountries.length === 0,
							});
						} else {
							finalDataToShowInTable.push({ fieldName: "Vat Numbers", isMissing: true });
						}
					}
					if(field.name === "Marketplaces") {
						if(field.value.length) {
							field.value.filter((element) => {
								const marketPlaceIdName = Const.marketPlaces[element.marketplaceTypeId];
								const typeOfProducts = element.productTypes.map(productId => Const.products[productId]).join(", ");
								if(element.marketplaceIdentifier) {
									finalDataToShowInTable.push({ fieldName: `Market Places ID - ${marketPlaceIdName}`, value: element.marketplaceIdentifier, isMissing: false });
									finalDataToShowInTable.push({ fieldName: `Market Places ID - ${marketPlaceIdName} | Products`, value: typeOfProducts, isMissing: element.productTypes.length ? false : true });
								} else {
									finalDataToShowInTable.push({ fieldName: `Market Places ID - ${marketPlaceIdName}`, value: element.marketplaceIdentifier, isMissing: true });
								}
							})
						} else {
							finalDataToShowInTable.push({ fieldName: "Market Places ID", isMissing: true });
						}
					}
				} else if (typeof field.value === "object" && field.value) {
					for (const key in field.value) {
						const value = field.value[key];
						if (!value) {
							finalDataToShowInTable.push({ fieldName:  Const.meaningfulNamesOfQuestionnaireData(`${field.name}_${key}`), isMissing: true });
						} else {
							finalDataToShowInTable.push({
								fieldName:  Const.meaningfulNamesOfQuestionnaireData(`${field.name}_${key}`),
								isMissing: false,
								value: key === "countryId" ? Const.getCountryName(value) : value,
							});
						}
					}
				} else if ((typeof field.value === "string" || typeof field.value === "number") && field.value !== undefined && field.value !== null && field.value !== '') {
					if(fieldsThatNeedUpdatedValues.includes(field.name)) {
						const updatedData = Utils.updateMeaningFulDataToQuestionnaire(field.value, field.name);
						finalDataToShowInTable.push(updatedData);
					} else {
						finalDataToShowInTable.push({ fieldName: Const.meaningfulNamesOfQuestionnaireData(field.name), value: field.value, isMissing: false });	
					}
				} else {
					finalDataToShowInTable.push({ fieldName: Const.meaningfulNamesOfQuestionnaireData(field.name), isMissing: true });
				}
			}
		});
		return finalDataToShowInTable;
	},
	updateClientDocumentStatus: async(isMissing, countryId, documentTypeId, note) => {
		const companyId = parseInt(Utils.selectedCompanyId());
		const whereObject = {company_id: {_eq: companyId},document_type_id: {_eq:documentTypeId}, country_id: {_eq:countryId } };
		if(isMissing) {
			const object = {company_id: companyId, document_type_id: documentTypeId, country_id: countryId, notes: note ?? OfflineDocuments.updatedRow.Note};
			const checkDocumentExistence = await Utils.checkDocumentsExistence(documentTypeId, countryId, companyId);
			console.log(checkDocumentExistence);
			if(!checkDocumentExistence) {
				await AddDocumentTracker.run({object: object}).then((resp) => resp.data ? showAlert("Document Status has been added as received successfully!", "success") : showAlert("Document Status has been removed from successfully!", "error"))
			} else {
				await UpdateDocumentTracker.run({whereObject: whereObject, setObject: {...object, active: 1}}).then((resp) => resp.data ? showAlert("Document State has been removed from received!", "success") : showAlert("Something went wrong!", "error"));
			}
		} else {
			await UpdateDocumentTracker.run({whereObject: whereObject, setObject: {active: 0}}).then((resp) => resp.data ? showAlert("Document State has been removed from received!", "success") : showAlert("Something went wrong!", "error"));
		}
		await CheckManuallyUpdatedDocs.run({companyId: parseInt(appsmith.URL.queryParams.companyId) });
		await Utils.getMissingDocumentsRevised();
	},
	getMissingOfflineDocuments: () => {
		const manuallyUpdatedDocs = CheckManuallyUpdatedDocs.data.data.prod.missionctrl_track_pending_docs
		const requiredOfflineDocuments = GetEssentialDataForInfoAndDocs.data.data.prod.missionctrl_map_offline_docs_to_country.map((document) => {
			return {
				Country: document.Country,
				DocumentType: document.Document
			}
		});
		const finalOfflineData = requiredOfflineDocuments.map((requiredDoc) => {
			const existingData = manuallyUpdatedDocs.find((doc) => doc.country_id === requiredDoc.Country.Id && doc.document_type_id === requiredDoc.DocumentType.id);
			if(existingData && existingData.active){
				return {
					Country: requiredDoc.Country,
					DocumentType: requiredDoc.DocumentType,
					missing: false,
					type: "OFFLINE",
					Note: existingData.notes
				}
			}
			else {
				return {
					Country: requiredDoc.Country,
					DocumentType: requiredDoc.DocumentType,
					missing: true,
					type: "OFFLINE",
					Note: existingData?.notes ? existingData?.notes : "" 
				}
			}
		})
		return finalOfflineData.sort((a, b) => (a.missing === b.missing) ? 0 : a.missing ? 1 : -1);
	},
	getMissingDocumentsRevised: () => {
		const documentDataFromPortal = DocumentAPI.data;
		const documentStatus = documentDataFromPortal.map((document) => {
			const countryName = Const.getCountryName(document.countryId);
			const documentTypeName = Const.getDocumentTypeName(document.documentTypeId);
			const isGenerated = document.isCompanyDocument || document.documentCategory == 5 ? "-" : document.generatedFile ? "YES" : "NO"
			const necessaryInfoForDocument = {Country: countryName, type: "ONLINE", DocumentType: documentTypeName, DocumentName: document.documentTypeName, Generated: isGenerated };
			if(!document.uploadedFile) {
				return {...necessaryInfoForDocument, missing: true}
			} else {
				return {...necessaryInfoForDocument, missing: false, UploadedDocumentName: document.uploadedFile.fileName, UploadedBy:document.uploadedFile.uploader.name, DocumentId:document.uploadedFile.id}
			}
		})
		return documentStatus;
	},
	downloadDocument: async(id) => {
		const resp = await DownloadDocumentAPI.run({id: id})
		navigateTo(resp.url)
	},
	updateJurisdictionStatus: async(isReady, countryId) => {
		if(!isReady){
			const statusObject = {country_id: countryId, company_id: parseInt(Utils.selectedCompanyId())}
			await UpdateJurisdictionStatus.run({status_object: statusObject})
			showAlert("Jurisdiction is now in the Ready Mode!", "success")
		} else {
			await RemoveJurisdictionStatus.run({companyId: parseInt(Utils.selectedCompanyId()), countryId: countryId});
			showAlert("Jurisdiction has been removed from ready state", "success")
		}
		await Company.run({company_id: parseInt(appsmith.URL.queryParams.companyId) });
	},
	addNote: async() => {
		const {documentTypeId, countryId, Note, missing} = OfflineDocuments.updatedRow;
		const companyId = parseInt(Utils.selectedCompanyId());
		const checkDocumentExistence = await Utils.checkDocumentsExistence(documentTypeId, countryId, companyId);
		if(!checkDocumentExistence) {
			const object = {company_id: parseInt(Utils.selectedCompanyId()), document_type_id: documentTypeId, country_id: countryId, notes: Note, active: missing ? 0 : 1};
			await AddDocumentTracker.run({object: object}).then((resp) => resp.data ? showAlert("Note has been added successfully!", "success") : showAlert("Something went wrong!", "error"));
		} else {
			const whereObject = {company_id: {_eq: companyId},document_type_id: {_eq:documentTypeId}, country_id: {_eq:countryId } };
			await UpdateDocumentTracker.run({whereObject: whereObject, setObject: {notes: Note}}).then((resp) => resp.data ? showAlert("Note has been updated successfully!", "success") : showAlert("Something went wrong!", "error"));
		}
		await CheckManuallyUpdatedDocs.run({companyId: parseInt(Utils.selectedCompanyId()) });
		await Utils.getMissingDocumentsRevised();
	},
	checkDocumentsExistence: async(documentTypeId, countryId, companyId) => {
		const doesDocumentExist = await CheckDocumentExistence.run({documentTypeId:documentTypeId, countryId:countryId, companyId:companyId })
		return doesDocumentExist && doesDocumentExist.data.prod.missionctrl_track_pending_docs.length ? true : false;
	},
	checkInformationExistence: async(informationTypeId, countryId, companyId) => {
		const doesInformationExist = await CheckInformationExistence.run({informationTypeId:informationTypeId, countryId:countryId, companyId:companyId })
		return doesInformationExist && doesInformationExist.data.prod.missionctrl_track_remaining_data_information.length ? true : false;
	},
	updateInformation: async() => {
		const  {jurisdiction_country_id, Value, information_id} = InformationSummaryCopy.updatedRow;
		const companyId = parseInt(Utils.selectedCompanyId());
		const whereObject = {company_id: {_eq: companyId},information_type_id: {_eq:information_id}, country_id: {_eq:jurisdiction_country_id}};
		const checkExistence = await Utils.checkInformationExistence(information_id, jurisdiction_country_id, companyId);
		if(checkExistence) {
			await UpdateOfflineInformation.run({whereObj: whereObject, setObj: {value: Value}}).then((resp) => resp.data ? showAlert("Value has been updated successfully!", "success") : showAlert("Something went wrong!", "error"));			
		} else {
			const insertObject = {country_id:jurisdiction_country_id, value: Value, information_type_id: information_id, company_id: companyId }
			await AddUserInformation.run({object: insertObject}).then((resp) => resp.data ? showAlert("Value has been added successfully!", "success") : showAlert("Something went wrong!", "error"));	
		}
		await AddStatusLog.run({statusObject: {status: !checkExistence ? "ADDED" : "REVOKED", agent: appsmith.user.username, company_id:companyId, information_id:information_id, country_id: jurisdiction_country_id, value: Value }})
		await CheckManuallyUpdatedInfo.run({companyId: parseInt(appsmith.URL.queryParams.companyId) });
		await Utils.getMissingInformation();
	},
	prepareASummary: () => {
		const onlineDocumentData = Utils.getMissingDocumentsRevised().map((doc) => {
			return {Country: doc.Country, missing: doc.missing, type: "ONLINE", Status: doc.missing ? "Missing on Portal" : "Uploaded on Portal", DataType: "Document", Property: doc.DocumentName}
		})
		const offlineDocumentData = Utils.getMissingOfflineDocuments().map((doc) => {
			return { missing: doc.missing, type: "OFFLINE", Status: doc.missing ? "Not Submitted Yet" : "Marked as Received", Country: doc.Country.NameEN, Property: doc.DocumentType.NameEN, DataType: "Document"}
		})
		const offlineInformation = Utils.getMissingInformation().map((info) => {
			return {Property: info.name, Country: info.jurisdiction_country, Status: info.missing ? "Not Submitted Yet" : "Marked as Received", DataType: "Information", type: "OFFLINE", missing: info.missing, Value: info.Value ?? ""}
		})
		const onlineInformation = Utils.getMissingQuestionnaireInformation().map((info) => {
			return {Property: info.fieldName, DataType: "Information", type: "ONLINE", missing: info.isMissing, Status: info.isMissing ? "Not Submitted Yet" : info.value}
		})
		return [...onlineDocumentData, ...offlineDocumentData, ...offlineInformation, ...onlineInformation];
	},
	uploadDocument: async () => {
		console.log(FilePicker1.files[0])
		const file = FilePicker1.files[0].data;
		let sasToken =
				"?sv=2022-11-02&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2023-10-06T13:21:37Z&st=2023-10-06T05:21:37Z&spr=https&sig=Uj%2F2k8Q%2FXR9KMvUywbqgP7LjwAymY3asq%2BKRlo6OOt8%3D";
		let storageAccountName = "missionctrlprod";
		let containerName = "taxuallyofflinedocs";
		const blobName = FilePicker1.files[0].name;
		const url = `https://${storageAccountName}.blob.core.windows.net/${containerName}/${blobName}${sasToken}`;
		fetch(url, {
			body: file,
			method: "PUT",
			headers: {
				"x-ms-blob-type": "BlockBlob",
				"x-ms-version": "2020-10-02",
				"Content-Type": "application/pdf"
			}
		})
			.then((response) => {
			if (response.ok) {
				console.log("Upload succeeded");
				showAlert("Uploaded! Whoop Whoop!")
			} else {
				console.error("Upload failed");
			}
		})
			.catch((error) => {
			console.error("Upload error", error);
		});
	}
}

// resetWidget("Form1");
// closeModal("File");

