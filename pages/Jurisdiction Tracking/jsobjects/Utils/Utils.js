export default {
	onLoad: async() => {
		await Promise.all([
			GetOfflineSubscription.run(),
			// GetTrackingSubscriptionData.run()
		])
		// Utils.getCompaniesData();
	},
	executeCompaniesOnChange: async() => {
		Utils.getCompaniesData();
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
		const allTrackedJurisdictions = GetTrackingSubscriptionData.data.data.prod.missionctrl_jurisdiction_tracking;
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
		await GetTrackingSubscriptionData.run();
		if(!Utils.isFilterActive()) {
			await GetCompanyData.run();
			if(!GetOfflineSubscription.isLoading && !GetTrackingSubscriptionData.isLoading) {
				const companyData = GetCompanyData.data.data.prod.missionctrl_track_company_status_wise;
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
			}
		} else {
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
		if(ModificationDoneSelect.selectedOptionValue !== "") {
			whereObject.modification_done = {_is_null: ModificationDoneSelect.selectedOptionValue};
		}
		if(CommentSelect.selectedOptionValue !== "") {
			whereObject._or = CommentSelect.selectedOptionValue ? {"comments": {_eq: ""}} : {"comments": {_neq: ""}}
		}
		whereObject.Company = {"LegalNameOfBusiness": {"_like": "%" + JurisdictionTrackingTable.searchText +"%"}}
		const where = Utils.isFilterActive() ? whereObject : {}
		return where;
	},
	isOfflineSubscribed: (companyId, countryId) => {
		const allOfflineSubsriptionData = GetOfflineSubscription.data.data.prod.missionctrl_offline_subscriptions;
		const isOffline = allOfflineSubsriptionData.some(data => data.company_id === companyId && data.country_id === countryId);
		return isOffline ? "OFFLINE" : "ONLINE";
	},
	mutateJurisdictionTracker: async() => {
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
		} = JurisdictionTrackingTable.updatedRow;
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
			const response = await AddJurisdictionTracking.run({object: mutationObject});
			if (response.data) {
				showAlert("Updated Jurisdiction Successfully!", "success");
			} else {
				showAlert("Something Went Wrong!", "error");
			}
			await Utils.onLoad();
			Utils.getCompaniesData();
		} catch (error) {
			console.error("An error occurred:", error);
		}
	},
	multipleUpdate: async() => {
		const tableUpdateData = JurisdictionTrackingTable.updatedRows;
		const dataToBeUpdated = tableUpdateData.map(data => {
			console.log(data.allFields)
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
		console.log(dataToBeUpdated)
		const response = await MultipleJurisdictionTracking.run({objects: dataToBeUpdated});
		if (response.data) {
			Utils.getCompaniesData();
			showAlert("Updated Jurisdiction Successfully!", "success");
		} else {
			showAlert("Something Went Wrong!", "error");
		}
	}
}