export default {
	executeCompaniesOnChange: async() => {
		await Utils.getCompaniesData();
	},
	onLoad: async() => {
		storeValue("firstTimeExecution", true)
		await GetOfflineSubscription.run();		
		await Utils.getCompaniesData();
		storeValue("firstTimeExecution", false)
	},
	getOptionsForAction: () => {
		const optionsArray = [
			"Letter to be sent",
			"Question the price",
			"Documents/info provided",
			"PoA submitted to office",
			"Ready for submission",
			"Letter sent - waiting for client",
			"Sales request",
			"Waiting for original documents",
			"Modification request"
		];
		return optionsArray.map(option => ({value: option, label: option}))
	},
	getOptionsForAgent: () => {
		const optionsArray = [
			'Moraka Thoka',
			'Lara Henrickson',
			'Johnne Ramsay',
			'Ingrid Swart',
			'Amber Hobson',
			'Lerato Kgaladi',
			'Emile Brandt',
			'Elizabeth Weyer-Henderson',
			'El Mahdi'
		];
		return optionsArray.map(option => ({value: option, label: option}))
	},
	getOptionsForCheckedOn: () => {
		return [{"label": "empty", value: true}, {"label": "not empty", value: false}];
	},
	getOptionsForDeregistration: () => {
		const optionsArray = ["", "Unsubscription", "Deregistration"];
		return optionsArray.map((option, index) => ({value: option, label: option}))
	},

	getDataForAlreadyTrackedJurisdiction: (companyId, countryId) => {
		const allTrackedJurisdictions = AllTrackingJurisdiction.data.data.prod.missionctrl_jurisdiction_tracking;
		const checkExistingRecord = allTrackedJurisdictions.find((jurisdiction) => jurisdiction.company_id == companyId && jurisdiction.country_id == countryId)
		if(checkExistingRecord) {
			return {
				comments: checkExistingRecord.comments,
				account_checked: checkExistingRecord.account_checked,
				sheet_link: checkExistingRecord.sheet_link,
				letter2_sent: checkExistingRecord.letter2_sent,
				latest_followup: checkExistingRecord.latest_followup,
				action: checkExistingRecord.action,
				modification_done: checkExistingRecord.modification_done,
				modification_request: checkExistingRecord.modification_request,
				sales_call_made: checkExistingRecord.sales_call_made,
				deregistration: checkExistingRecord.deregistration,
				outcome: checkExistingRecord.outcome,
				agent: checkExistingRecord.agent,
				application_submitted_to_ta: checkExistingRecord.application_submitted_to_ta,
				poa_received_date: checkExistingRecord.poa_received_date
			}
		} else {
			return {
				comments: "",
				account_checked: "",
				sheet_link: "",
				letter2_sent: "",
				latest_followup: "",
				action: "",
				modification_done: "",
				modification_request: "",
				sales_call_made: "",
				deregistration: "",
				outcome: "",
				agent: "",
				application_submitted_to_ta: "",
				poa_received_date: ""
			}
		}
	},
	getCompaniesData: async() => {
		if(!Utils.isFilterActive() && !GetOfflineSubscription.isLoading) {
			// await GetCompanyData.run();
			// const companyIds = GetCompanyData.data.data.prod.missionctrl_track_company_status_wise.map(company => company.Company.Id);
			// await AllTrackingJurisdiction.run({companies: companyIds})
			let companyData;
			const runGetCompanyData = GetCompanyData.run();
			const runAllTrackingJurisdiction = runGetCompanyData.then(() => {
				const companyIds = GetCompanyData.data.data.prod.missionctrl_track_company_status_wise.map(company => company.Company.Id);
				return AllTrackingJurisdiction.run({companies: companyIds});
			})
			await Promise.all([runGetCompanyData, runAllTrackingJurisdiction]);
			// if(!JurisdictionSelect.selectedOptionValues.length) {
			companyData = GetCompanyData.data.data.prod.missionctrl_track_company_status_wise;
			// } else {
			// companyData = GetCompanyData.data.data.prod.missionctrl_track_company_status_wise.map((company) => {
			// const currentJurisdictions = company.Company.current_orders.map(jurisdiciton => jurisdiciton.country.Id);
			// console.log(company.Company.current_orders, "****")
			// const doesExistInCurrentSelection = currentJurisdictions.some(item => JurisdictionSelect.selectedOptionValues.includes(item))
			// if(doesExistInCurrentSelection) return company
			// })
			// console.log(companyData)
			// }
			const jurisdictionWiseData = companyData.flatMap((company) => {
				const { LegalNameOfBusiness } = company.Company;
				const { Id } = company.Company;
				const offlineSubscriptions = GetOfflineSubscription.data.data.prod.missionctrl_offline_subscriptions
				.filter(sub => sub.company_id === Id)
				.map(subscribed => {
					const getOtherDataFromDB = Utils.getDataForAlreadyTrackedJurisdiction(Id, subscribed.country?.Id);
					return { Name: LegalNameOfBusiness, JurisdictionCountry: subscribed.Country.NameEN, country_id: subscribed.country_id, company_id: Id, type: "OFFLINE", ...getOtherDataFromDB }
				})
				const onlineSubscriptions = company.Company.current_orders
				.map(subscribed => {
					const getOtherDataFromDB = Utils.getDataForAlreadyTrackedJurisdiction(Id, subscribed.country?.Id);
					return { Name: LegalNameOfBusiness, JurisdictionCountry: subscribed.country?.NameEN, country_id: subscribed.country?.Id, company_id: Id, type: "ONLINE", ...getOtherDataFromDB }
				});
				return [...offlineSubscriptions, ...onlineSubscriptions];
			});
			return jurisdictionWiseData;
		} else {
			await GetTrackingSubscriptionData.run();
			const filteredData = GetTrackingSubscriptionData.data.data.prod.missionctrl_jurisdiction_tracking
			const refinedData = filteredData.map(element => {
				return {
					...element,
					Name: element.Company.LegalNameOfBusiness,
					JurisdictionCountry: element.Country.NameEN,
					type: Utils.isOfflineSubscribed(element.company_id, element.country_id),
				}
			})
			return refinedData;
		}
	},
	isFilterActive: () => {
		if(AgentFilterSelect.selectedOptionValue || ActionSelect.selectedOptionValue || CheckedOnSelect.selectedOptionValue || CheckedOnSelect.selectedOptionValue !== "" || PoASentSelect.selectedOptionValue !== "" || ModificationDoneSelect.selectedOptionValue !== "" || CommentSelect.selectedOptionValue !== "" ) return true;
		return false;
	},
	constructWhereObject: () => {
		const where = {"Company": {"LegalNameOfBusiness": {_like: !FullMode.isSwitchedOn ? "%" + JurisdictionTrackingTable.searchText + "%": "%%"}}, "_and": [{"Company": {"TenantId": {"_eq": "BB2090DC-81C1-49ED-AE2E-5016C79464AB"}}}]}
		return where;
	},
	constructWhereObjectForFilter: () => {
		const whereObject = {};
		whereObject.agent = {_like: "%" + AgentFilterSelect.selectedOptionValue +"%"};
		whereObject.action = {_like: "%" + ActionSelect.selectedOptionValue +"%"};
		if(CheckedOnSelect.selectedOptionValue !== "") {
			whereObject.account_checked = {_is_null: CheckedOnSelect.selectedOptionValue};
		} 
		if(PoASentSelect.selectedOptionValue !== "") {
			whereObject.letter2_sent = {_is_null: PoASentSelect.selectedOptionValue};
		} 
		if(SalesCallSelect.selectedOptionValue !== "") {
			whereObject.sales_call_made = {_is_null: SalesCallSelect.selectedOptionValue};
		} 
		if(PoAReceivedSelect.selectedOptionValue !== "") {
			whereObject.poa_received_date = {_is_null: PoAReceivedSelect.selectedOptionValue};
		}
		if(LatestFollowUpSelect.selectedOptionValue !== "") {
			whereObject.latest_followup = {_is_null: LatestFollowUpSelect.selectedOptionValue};
		}
		if(ApplicationSubmittedSelect.selectedOptionValue !== "") {
			whereObject.application_submitted_to_ta = {_is_null: ApplicationSubmittedSelect.selectedOptionValue};
		}
		if(ModificationDoneSelect.selectedOptionValue !== "") {
			whereObject.modification_done = {_is_null: ModificationDoneSelect.selectedOptionValue};
		}
		if(CommentSelect.selectedOptionValue !== "") {
			whereObject._or = CommentSelect.selectedOptionValue ? {"comments": {_eq: ""}} : {"comments": {_neq: ""}}
		}

		whereObject.deregistration = {_like: "%" + DeregistrationSelect.selectedOptionValue +"%"};
		whereObject.Company = {"LegalNameOfBusiness": {"_like": "%" + JurisdictionTrackingTable.searchText +"%"}}
		const where = Utils.isFilterActive() ? whereObject : {}
		return where;
	},
	isOfflineSubscribed: (companyId, countryId) => {
		const allOfflineSubsriptionData = GetOfflineSubscription.data.data.prod.missionctrl_offline_subscriptions;
		const isOffline = allOfflineSubsriptionData.some(data => data.company_id === companyId && data.country_id === countryId);
		return isOffline ? "OFFLINE" : "ONLINE";
	},
	convertUpdateDataToJurisdictionForm: (data, action="UPDATE") => {
		if(action === "UPDATE") {
			const dataToBeUpdated = data.map(data => {
				delete data["allFields"]["JurisdictionCountry"];
				delete data["allFields"]["Name"];
				delete data["allFields"]["type"];
				delete data["allFields"]["id"];
				if(data["allFields"]["Company"]) delete data["allFields"]["Company"];
				if(data["allFields"]["Country"]) delete data["allFields"]["Country"];
				return {
					...data["allFields"],
					account_checked: data.allFields.account_checked || null,
					latest_followup: data.allFields.latest_followup || null,
					letter2_sent: data.allFields.letter2_sent || null,
					modification_done: data.allFields.modification_done || null,
					application_submitted_to_ta: data.allFields.application_submitted_to_ta || null,
					poa_received_date: data.allFields.poa_received_date || null,
					sales_call_made: data.allFields.sales_call_made || null,
				}
			})
			return dataToBeUpdated
		} else {
			const dataToBeUpdated = data.map(data => {
				delete data["JurisdictionCountry"];
				delete data["Name"];
				delete data["type"];
				delete data["id"];
				if(data["Company"]) delete data["Company"];
				if(data["Country"]) delete data["Country"];
				return {
					...data,
					account_checked: data.account_checked || null,
					latest_followup: data.latest_followup || null,
					letter2_sent: data.letter2_sent || null,
					modification_done: data.modification_done || null,
					application_submitted_to_ta: data.application_submitted_to_ta || null,
					poa_received_date: data.poa_received_date || null,
					sales_call_made: data.sales_call_made || null,
				}
			})
			return dataToBeUpdated
		}
	},
	getCountriesLookup: () => {
		return GetCountries.data.data.prod.Countries.map(country => {
			return {value: country.Id, label: country.NameEN }
		})
	},
	updateEditingStore: (currentlyEditedCell, companyId, countryId) => {
		const currentEditingStore = appsmith.store.currentEditStore
		if(currentEditingStore.company_id === companyId && currentEditingStore.country_id === countryId) {
			const [currentObjectKey] = Object.keys(currentlyEditedCell);
			if(currentEditingStore[currentObjectKey]) {
				delete currentEditingStore[currentObjectKey]
			}
			const newEditedObject = {...currentlyEditedCell, ...currentEditingStore};
			storeValue("currentEditStore", newEditedObject)
		} else {
			storeValue("currentEditStore", {...currentlyEditedCell, company_id: companyId, country_id:countryId })
		}
	},
	mutateJurisdictionTracker: async(cellName) => {
		const triggeredRow = JurisdictionTrackingTable.triggeredRow
		const payloadForStore = {[cellName]: triggeredRow[cellName] }
		Utils.updateEditingStore(payloadForStore, triggeredRow.company_id, triggeredRow.country_id);
		const {
			account_checked,
			action,
			comments,
			company_id,
			country_id,
			deregistration,
			latest_followup,
			letter2_sent,
			modification_done,
			modification_request,
			sales_call_made,
			sheet_link,
			outcome,
			agent,
			application_submitted_to_ta,
			poa_received_date
		} = JurisdictionTrackingTable.triggeredRow;
		const mutationObject = {
			account_checked: account_checked || null,
			action,
			comments,
			company_id,
			country_id,
			deregistration,
			latest_followup: latest_followup || null,
			letter2_sent: letter2_sent || null,
			modification_done: modification_done || null,
			modification_request,
			sales_call_made: sales_call_made || null,
			sheet_link,
			outcome,
			agent,
			application_submitted_to_ta: application_submitted_to_ta || null,
			poa_received_date: poa_received_date || null
		};

		try {
			await AddJurisdictionTracking.run({object: mutationObject});
			Utils.getCompaniesData();
		} catch (error) {
			console.error("An error occurred:", error);
		}
	},
	bulkEdit: async() => {
		if(JurisdictionTrackingTable.selectedRows.length >= 2 && appsmith.store.currentEditStore) {
			const databaseFormat = Utils.convertUpdateDataToJurisdictionForm(JurisdictionTrackingTable.selectedRows, "SELECTED");
			const {company_id, country_id, ...restParentData} = appsmith.store.currentEditStore;
			const child_rows = databaseFormat.slice(1);
			const refinedChildRows = child_rows.filter((row) => row.company_id === company_id).map((data) => ({...data, ...restParentData}));
			const differentCompanySelected = child_rows.some((row) => row.company_id !== company_id);
			if(differentCompanySelected) showAlert("You selected different company/companies than parent row, we've ignored them!", "info")
			if(refinedChildRows.length) {
				const response = await MultipleJurisdictionTracking.run({objects: refinedChildRows});
				if (response.data) {
					Utils.getCompaniesData();
					showAlert("Updated Jurisdiction Successfully!", "success");
				} else {
					showAlert("Something Went Wrong!", "error");
				}
			}
		}
	}
}