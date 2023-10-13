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

		return requiredInformation.map((information) => {
			const hasAlreadyBeenAdded = submittedInformation.find((info) => info.information_type_id === information.Information.id && info.country_id === information.Country.Id);
			return {
				name: information.Information.information,
				jurisdiction_country: information.Country.NameEN,
				jurisdiction_country_id: information.Country.Id,
				information_id: information.Information.id,
				SpecialComments: information.special_comments,
				missing: hasAlreadyBeenAdded?.value ? false : true,
				Value: hasAlreadyBeenAdded ? hasAlreadyBeenAdded.value : "",
				Irrelevant: hasAlreadyBeenAdded ? hasAlreadyBeenAdded.irrelevant : 0,
				Poa: information.Information.poa ? "YES" : "NO",
				Filing: information.Information.filing ? "YES" : "NO"
			};
		});
	},
	necessaryThingsToRunOnLoad: async() => {
		if (appsmith.URL.queryParams.companyId) {
			const companyId = parseInt(appsmith.URL.queryParams.companyId);
			GetOfflineSubscription.run();
			const companyTask = Company.run({ company_id: companyId });
			const jurisdictionsTask = companyTask.then(() => {
				const jurisdictions = Company.data.data.prod.Companies_by_pk.current_orders;
				return jurisdictions.map(jurisdiction => jurisdiction.country.Id)
			});
			Promise.all([companyTask, jurisdictionsTask]).then(([_, jurisdictioncountryIds]) => {
				const type = Company.data.data.prod.Companies_by_pk.Country.EuVatArea ? "EU" : "NON-EU";
				const companyType = Company.data.data.prod.Companies_by_pk.LegalStatus.NameEN === "Company" ? "COMPANY" : "INDIVIDUAL";
				const offlineSubscribedCountriesIds = GetOfflineSubscription.data.data.prod.missionctrl_offline_subscriptions.map(data => data.country_id)
				jurisdictioncountryIds.push(...offlineSubscribedCountriesIds)
				return GetEssentialDataForInfoAndDocs.run({ countryIds: jurisdictioncountryIds, type: type, companyType:companyType });
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
		const { current_orders } = Company.data.data.prod.Companies_by_pk;
		const { missionctrl_track_jurisdiction_status } = Company.data.data.prod;
		const currentCompanyId = parseInt(Utils.selectedCompanyId());
		const jurisdictionsValue = current_orders.map((jurisdiction) => {
			const isReady = missionctrl_track_jurisdiction_status.some((trackedJurisdiction) => (
				trackedJurisdiction.country_id === jurisdiction.country.Id && trackedJurisdiction.company_id === currentCompanyId
			));
			return {
				name: `${jurisdiction.status.name} - ${jurisdiction.country.NameEN} - ${jurisdiction.country.Code}`,
				countryId: jurisdiction.country.Id,
				isReady,
				type: "ONLINE"
			};
		});
		const offlineJurisdiction = GetOfflineSubscription.data.data.prod.missionctrl_offline_subscriptions.map(subscription => {
			return {
				name: `Offline - ${subscription.Country.NameEN}`,
				isReady: subscription.active ? true : false,
				countryId: subscription.country_id,
				type: "OFFLINE"
			}
		})
		return [...offlineJurisdiction, ...jurisdictionsValue];
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
				case "LegalForm":
					return {fieldName: updatedFieldName, isMissing: false, value: Const.LegalStatus[value]}
					break;
				case "LegalRepresentative_PersonalIdentificationType": 
					return {fieldName: updatedFieldName, isMissing: false, value: Const.identification[value]}
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
		const fieldsThatNeedUpdatedValues = ["LegalRepresentative_Position", "LegalRepresentative_Gender", "CountryOfIncorporation", "LegalRepresentative_IsPoliticallyExposed","LegalRepresentative_OthersOwnsMoreThan25Percent", "LegalRepresentative_OwnsMoreThan25Percent", "LegalRepresentative_Nationality", "LegalRepresentative_CountryOfBirth", "NeedEarlierVatReg", "LegalForm", "LegalRepresentative_PersonalIdentificationType"]
		const dateFields = ["LegalRepresentative_BirthDate", "IncorporationDate"]
		if(Company.data.data.prod.Companies_by_pk.LegalStatus.NameEN === "Individual") {
			finalDataToShowInTable.push({
				fieldName: "Incorporation Date",
				value: Company.data.data.prod.Companies_by_pk.IncorporationDate || "",
				isMissing: !Company.data.data.prod.Companies_by_pk.IncorporationDate,
			});

			finalDataToShowInTable.push({
				fieldName: "Incorporation Number",
				value: Lib.formatDate(Company.data.data.prod.Companies_by_pk.IncorporationNumber) || "",
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
					} else if(dateFields.includes(field.name)) {
						finalDataToShowInTable.push({ fieldName: Const.meaningfulNamesOfQuestionnaireData(field.name), value: Lib.formatDate(field.value), isMissing: false });	
					}
					else {
						finalDataToShowInTable.push({ fieldName: Const.meaningfulNamesOfQuestionnaireData(field.name), value: field.value, isMissing: false });	
					}
				} else {
					finalDataToShowInTable.push({ fieldName: Const.meaningfulNamesOfQuestionnaireData(field.name), isMissing: true });
				}
			}
		});
		return finalDataToShowInTable;
	},
	getMissingOfflineDocuments: () => {
		const manuallyUpdatedDocs = CheckManuallyUpdatedDocs.data.data.prod.missionctrl_track_pending_docs
		const requiredOfflineDocuments = GetEssentialDataForInfoAndDocs.data.data.prod.missionctrl_map_offline_docs_to_country.map((document) => {
			return {
				Country: document.Country,
				DocumentType: document.Document,
				SpecialComments: document.special_comments
			}
		});
		const finalOfflineData = requiredOfflineDocuments.map((requiredDoc) => {
			const existingData = manuallyUpdatedDocs.find((doc) => doc.country_id === requiredDoc.Country.Id && doc.document_type_id === requiredDoc.DocumentType.id);
			return {
				Country: requiredDoc.Country,
				DocumentType: requiredDoc.DocumentType,
				SpecialComments: requiredDoc.SpecialComments,
				missing: existingData?.document_name ? false : true,
				type: "OFFLINE",
				DocumentName: existingData ? existingData.document_name : "",
				Irrelevant: existingData ? existingData.irrelevant : 0
			}
		});

		return finalOfflineData.sort((a, b) => (a.missing === b.missing) ? 0 : a.missing ? 1 : -1);
	},
	getMissingDocumentsRevised: () => {
		const documentDataFromPortal = DocumentAPI.data;
		const documentStatus = documentDataFromPortal.map((document) => {
			const countryName = document.isCompanyDocument ? `${Utils.selectedCompany().LegalNameOfBusiness} | ${Const.getCountryName(document.countryId)}` : Const.getCountryName(document.countryId);
			const documentTypeName = Const.getDocumentTypeName(document.documentTypeId);
			const isGenerated = document.isCompanyDocument || document.documentCategory == 5 ? "-" : document.generatedFile ? "YES" : "NO"
			const necessaryInfoForDocument = {Country: countryName, type: "ONLINE", DocumentType: documentTypeName, DocumentName: document.documentTypeName, Generated: isGenerated, StatusId: document.documentStatus };
			if(!document.uploadedFile) {
				return {...necessaryInfoForDocument, missing: true, Status: Const.documentStatus[document.documentStatus]}
			} else {
				return {...necessaryInfoForDocument, missing: false, UploadedDocumentName: document.uploadedFile.fileName, UploadedBy:document.uploadedFile.uploader.name, DocumentId:document.uploadedFile.id, Status: Const.documentStatus[document.documentStatus]}
			}
		})
		return documentStatus;
	},
	downloadDocument: async(id) => {
		const resp = await DownloadDocumentAPI.run({id: id})
		navigateTo(resp.url)
	},
	updateJurisdictionStatus: async(isReady, countryId, type) => {
		if(type === "ONLINE") {
			if(!isReady){
				const statusObject = {country_id: countryId, company_id: parseInt(Utils.selectedCompanyId())}
				await UpdateJurisdictionStatus.run({status_object: statusObject})
				showAlert("Jurisdiction is now in the Ready Mode!", "success")
			} else {
				await RemoveJurisdictionStatus.run({companyId: parseInt(Utils.selectedCompanyId()), countryId: countryId});
				showAlert("Jurisdiction has been removed from ready state", "success")
			}
			await Company.run({company_id: parseInt(parseInt(Utils.selectedCompanyId())) });
		} else if(type === "OFFLINE") {
			const whereObj = {country_id: {_eq: countryId}, company_id: {_eq: parseInt(Utils.selectedCompanyId())}};
			const setObj = {active : isReady ? 0 : 1};
			await UpdateOfflineSubscription.run({whereObj, setObj}).then((res) => res.data ? showAlert("Updated Offline Jurisdiction", "success") : showAlert("Something went wrong!", "error"));
			await Promise.all([
				GetOfflineSubscription.run(),
				Company.run({ company_id: parseInt(Utils.selectedCompanyId()) })
			]);
		}
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
		const checkExistence = await Utils.checkInformationExistence(information_id, jurisdiction_country_id, companyId);
		const insertObject = {country_id:jurisdiction_country_id, value: Value, information_type_id: information_id, company_id: companyId, irrelevant: 0 }
		await AddUserInformation.run({object: insertObject}).then((resp) => resp.data ? showAlert("Value has been added successfully!", "success") : showAlert("Something went wrong!", "error"));	
		await AddStatusLog.run({statusObject: {status: !checkExistence ? "ADDED" : "UPDATED", agent: appsmith.user.username, company_id:companyId, information_id:information_id, country_id: jurisdiction_country_id, value: Value }})
		await CheckManuallyUpdatedInfo.run({companyId: parseInt(appsmith.URL.queryParams.companyId) });
		await Utils.getMissingInformation();
	},
	prepareASummary: () => {
		const onlineDocumentData = Utils.getMissingDocumentsRevised().map((doc) => {
			return {Country: doc.Country, missing: doc.missing, type: "ONLINE", Status: doc.missing ? "Missing on Portal" : "Uploaded on Portal", DataType: "Document", Property: doc.DocumentName, Value: doc.UploadedDocumentName ?? "", PortalStatus: doc.Status}
		})
		const offlineDocumentData = Utils.getMissingOfflineDocuments().map((doc) => {
			return { missing: doc.missing, type: "OFFLINE", Status: doc.missing ? "Not Submitted Yet" : "Marked as Received", Country: doc.Country.NameEN, Property: doc.DocumentType.NameEN, DataType: "Document", Value: doc.DocumentName ?? "", POA: doc.DocumentType.poa ? "YES" : "NO", Filing: doc.DocumentType.filing ? "YES" : "NO", Signed: doc.DocumentType.signed ? "YES" : "NO", Irrelevant: doc.Irrelevant ? "YES" : "NO", SpecialComments: doc.SpecialComments}
		})
		const offlineInformation = Utils.getMissingInformation().map((info) => {
			return {Property: info.name, Country: info.jurisdiction_country, Status: info.missing ? "Not Submitted Yet" : "Marked as Received", DataType: "Information", type: "OFFLINE", missing: info.missing, Value: info.Value ?? "", POA: info.Poa, Filing: info.Filing, Irrelevant: info.Irrelevant ? "YES" : "NO", SpecialComments: info.SpecialComments}
		})
		const onlineInformation = Utils.getMissingQuestionnaireInformation().map((info) => {
			return {Country: !info.fieldName.startsWith("VAT") ? "Account Level" : Const.getCountryNameByCode(info.fieldName.split(" ").slice(-1).join("")), Property: info.fieldName, DataType: "Information", type: "ONLINE", missing: info.isMissing, Status: info.isMissing ? "Not Submitted Yet" : "Submitted on Portal", Value: info.value ?? ""}
		})
		return [...onlineDocumentData, ...offlineDocumentData, ...offlineInformation, ...onlineInformation];
	},
	openFileModal: (countryId, documentTypeId, documentName, countryName) => {
		storeValue("FileUploadData", {companyId: Utils.selectedCompanyId(), countryId, documentTypeId, documentName, countryName})
		showModal("FileUploadModal")
	},
	constructUrl: (fileName) => {
		let sasToken =
				"?sv=2022-11-02&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=2024-04-11T21:25:22Z&st=2023-10-06T13:25:22Z&spr=https&sig=wgQeu%2FFL6dQUIcIjecock8jOdDgPCnY6zEhTop7%2B5BQ%3D";
		let storageAccountName = "missionctrlprod";
		let containerName = "taxuallyofflinedocs";
		const url = `https://${storageAccountName}.blob.core.windows.net/${containerName}/${fileName}${sasToken}`;
		return url;
	},
	uploadDocument: async () => {
		const {documentTypeId, countryId, companyId} = appsmith.store.FileUploadData;
		const fileData = FilePicker1.files[0].data;
		const blobName = Utils.selectedCompanyId() + "/" + FilePicker1.files[0].name;
		const arrayBuffer = Utils.base64ToArrayBuffer(fileData)
		const url = Utils.constructUrl(blobName);
		storeValue("UploadingOfflineDocument", true);
		fetch(url, {
			body: arrayBuffer,
			method: "PUT",
			headers: {
				"x-ms-blob-type": "BlockBlob",
				"x-ms-version": "2020-10-02",
				"Content-Type": FilePicker1.files[0].type
			}
		})
			.then(async (response) => {
			if (response.ok) {
				resetWidget("FilePicker1");
				closeModal("FileUploadModal");
				const checkDocumentExistence = await Utils.checkDocumentsExistence(documentTypeId, countryId, companyId);
				const object = {company_id: parseInt(Utils.selectedCompanyId()), document_type_id: documentTypeId, country_id: countryId, document_name: blobName, irrelevant: 0};
				await AddDocumentTracker.run({object: object}).then((resp) => resp.data ? showAlert("Document has been added successfully!", "success") : showAlert("Something went wrong!", "error"));
				await AddDocumentStatusLog.run({documentStatusObject: {status: !checkDocumentExistence ? "ADDED" : "UPDATED", agent: appsmith.user.username, company_id:companyId, document_id:documentTypeId, country_id: countryId, document_name: blobName }})
				await CheckManuallyUpdatedDocs.run({companyId: parseInt(Utils.selectedCompanyId()) });
				await Utils.getMissingDocumentsRevised();
			} else {
				showAlert("Oh no! Something went wrong!", "error")
			}
		})
			.catch((error) => {
			console.error("Upload error", error);
		});
		storeValue("UploadingOfflineDocument", false);
	},
	deleteDocument: async (countryId, documentTypeId, documentName) => {
		const url = Utils.constructUrl(documentName);
		try {
			const response = await fetch(url, { method: 'DELETE' });
			if (response.ok) {
				const whereObject = {
					"company_id": { "_eq": parseInt(Utils.selectedCompanyId()) },
					"document_type_id": { "_eq": documentTypeId },
					"country_id": { "_eq": countryId }
				};
				await DeleteDocument.run({ whereObj: whereObject }).then((resp) => {
					if (resp.data) {
						showAlert("Document has been deleted successfully!", "success");
					} else {
						showAlert("Something went wrong!", "error");
					}
				});
				showAlert("File has been deleted successfully!", "success");
				await AddDocumentStatusLog.run({documentStatusObject: {status: "REMOVED", agent: appsmith.user.username, company_id:parseInt(Utils.selectedCompanyId()), document_id:documentTypeId, country_id: countryId, document_name: documentName }})
				await CheckManuallyUpdatedDocs.run({ companyId: parseInt(appsmith.URL.queryParams.companyId) });
				await Utils.getMissingDocumentsRevised();
			} else {
				showAlert('Failed to delete file:', response.statusText);
			}
		} catch (error) {
			console.error('Error:', error);
		}
	},
	base64ToArrayBuffer: (base64) => {
		const binaryString = atob(base64.split(",")[1]);
		const len = binaryString.length;
		const bytes = new Uint8Array(len);
		for (let i = 0; i < len; i++) {
			bytes[i] = binaryString.charCodeAt(i);
		}
		return bytes.buffer;
	},
	getDocument: async(documentName) => {
		const url = Utils.constructUrl(documentName);
		navigateTo(url, {}, "NEW_WINDOW")
	},
	getHistoryOfDocument: async(documentTypeId, countryId) => {
		await GetHistoryOfDocument.run({company_id:parseInt(Utils.selectedCompanyId()), document_id: documentTypeId, country_id: countryId })
		showModal("HistoryOfDocument")
	},
	irrelavantFlagUpdate: async (dataType) => {
		if(dataType === "OFFLINE_DOCUMENT") {
			const  {documentTypeId, countryId, Irrelevant, DocumentName} = OfflineDocuments.updatedRow;
			const companyId = parseInt(Utils.selectedCompanyId())
			const object = {company_id: companyId, document_type_id: documentTypeId, country_id: countryId, document_name: DocumentName ?? "", irrelevant: Irrelevant ? 1 : 0};
			await AddDocumentTracker.run({object: object}).then((resp) => resp.data ? showAlert(`Document ${Irrelevant ? "Added as" : "Removed From"} Irrelevant`, "success") : showAlert("Something went wrong!", "error"));
			await CheckManuallyUpdatedDocs.run({companyId: parseInt(Utils.selectedCompanyId())});
			await Utils.getMissingOfflineDocuments();
		} else if(dataType === "OFFLINE_INFORMATION") {
			const  {jurisdiction_country_id, Value, information_id, Irrelevant} = InformationSummaryCopy.updatedRow;
			const companyId = parseInt(Utils.selectedCompanyId());
			const insertObject = {country_id:jurisdiction_country_id, value: Value ?? "", information_type_id: information_id, company_id: companyId, irrelevant:Irrelevant ? 1 : 0 };
			await AddUserInformation.run({object: insertObject}).then((resp) => resp.data ? showAlert("Value has been added successfully!", "success") : showAlert("Something went wrong!", "error"));
			await CheckManuallyUpdatedInfo.run({companyId: parseInt(appsmith.URL.queryParams.companyId) });
			await Utils.getMissingInformation();
		}
	},
	addNote: async() => {
		const object = {note: NoteForm.data.NoteInput, company_id: parseInt(Utils.selectedCompanyId())};
		await AddNote.run({object}).then((resp) => resp.data ? showAlert("Nore has been added successfully!", "success") : showAlert("Something went wrong!", "error"));
		Company.run({ company_id: parseInt(Utils.selectedCompanyId()) })
	},
	getNote: () => {
		const noteDataFromDB = Company.data.data.prod.missionctrl_company_notes;
		const note = noteDataFromDB.length > 0 ? noteDataFromDB[0].note : "";
		return note;
	},
	getAdditionalInformation: () => {
		const additionalData = [];
		const companyName = {"Name": "Company Name", "Value": Utils.selectedCompany().LegalNameOfBusiness}
		const status = {"Name": "Company Status", "Value": Company.data.data.prod.missionctrl_track_company_status_wise[0].CompanyStatus.name}
		const wave = {"Name": "Wave", "Value": Company.data.data.prod.missionctrl_track_company_status_wise[0].Wave.wave_name}
		const comment = {"Name": "Comment", "Value": Utils.getNote()}
		additionalData.push(companyName, status, wave, comment)
		const jurisdictionData = Utils.getAllCompanyJurisdiction();
		jurisdictionData.forEach((data) => {
			additionalData.push({"Name": data.name, "Value": data.isReady ? "Ready" : "Not Ready"})
		})
		return additionalData;
	},
	getCountriesForOfflineSubscription: () => {
		const onlineSubscribedCountries = Company.data.data.prod.Companies_by_pk.current_orders.map(order => order.country.Id);
		const assignedOfflineSubscriptions = GetOfflineSubscription.data.data.prod.missionctrl_offline_subscriptions;
		const allCountries = GetCountries.data.data.prod.Countries;
		const countriesEligibleForOffline = allCountries
		.map(country => {
			const isOnlineSubscribed = onlineSubscribedCountries.includes(country.Id);
			if (isOnlineSubscribed) {
				return null;
			}
			const matched = assignedOfflineSubscriptions.some(offlineCountry => (
				country.Id === offlineCountry.country_id &&
				offlineCountry.company_id === parseInt(Utils.selectedCompanyId())
			));
			return {
				Id: country.Id,
				Name: country.NameEN,
				assigned: matched ? true : false
			};
		})
		.filter(country => country !== null)
		.sort((a, b) => {
			if (a.assigned && !b.assigned) return -1;
			if (!a.assigned && b.assigned) return 1;
			return 0;
		});
		return countriesEligibleForOffline;
	},
	handleOfflineSubscriptionOperation: async(assigned, countryId) => {
		const companyId = parseInt(Utils.selectedCompanyId());
		if(assigned) {
			const whereObj = {company_id: {_eq: companyId}, country_id: {_eq: countryId}}
			await RemoveOfflineSubscription.run({whereObj})
		} else {
			const object = {company_id: companyId, country_id: countryId}
			await AddOfflineSubscription.run({object: object})
		}
		Utils.necessaryThingsToRunOnLoad();
		// closeModal("OfflineSubscription")
	}
}

