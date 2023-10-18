export default {
	onLoad: async() => {
		await Promise.all([
			GetCompanyData.run(),
			GetOfflineSubscription.run(),
			GetTrackingSubscriptionData.run()
		])
	},
	executeCompaniesOnChange: async() => {
		await GetCompanyData.run();
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
			"Waiting for original documents"
		];
		return optionsArray.map(option => ({value: option, label: option}))
	},
	getDataForAlreadyTrackedJurisdiction: (companyId, countryId) => {
		const allTrackedJurisdictions = GetTrackingSubscriptionData.data.data.prod.missionctrl_jurisdiction_tracking;
		const checkExistingRecord = allTrackedJurisdictions.find((jurisdiction) => jurisdiction.company_id == companyId && jurisdiction.country_id == countryId)
		// console.log(checkExistingRecord, "****")
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
				deregistration: checkExistingRecord.deregistration ? true : false,
				outcome: checkExistingRecord.outcome,
				agent: checkExistingRecord.agent
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
				agent: ""
			}
		}
	},
	getCompaniesData: () => {
		if(!GetCompanyData.isLoading && !GetOfflineSubscription.isLoading && !GetTrackingSubscriptionData.isLoading) {
			const companyData = GetCompanyData.data.data.prod.missionctrl_track_company_status_wise;
			const jurisdictionWiseData = companyData.flatMap((company) => {
				const { LegalNameOfBusiness } = company.Company;
				const { Id } = company.Company;
				const offlineSubscriptions = GetOfflineSubscription.data.data.prod.missionctrl_offline_subscriptions
				.filter(sub => sub.company_id === Id)
				.map(subscribed => {
					const getOtherDataFromDB = Utils.getDataForAlreadyTrackedJurisdiction(Id, subscribed.country?.Id);
					return { Name: LegalNameOfBusiness, JurisdictionCountry: subscribed.Country.NameEN, countryId: subscribed.country_id, companyId: Id, type: "OFFLINE", ...getOtherDataFromDB }
				})
				const onlineSubscriptions = company.Company.current_orders
				.map(subscribed => {
					const getOtherDataFromDB = Utils.getDataForAlreadyTrackedJurisdiction(Id, subscribed.country?.Id);
					return { Name: LegalNameOfBusiness, JurisdictionCountry: subscribed.country?.NameEN, countryId: subscribed.country?.Id, companyId: Id, type: "ONLINE", ...getOtherDataFromDB }
				});
				return [...offlineSubscriptions, ...onlineSubscriptions];
			});
			return jurisdictionWiseData;
		}
	},
	mutateJurisdictionTracker: async() => {
		const {
			account_checked,
			action,
			comments,
			companyId,
			countryId,
			deregistration,
			latest_followup,
			letter2_sent,
			modification_done,
			modification_request,
			sales_call_made,
			sheet_link,
			outcome,
			agent
		} = JurisdictionTrackingTable.updatedRow;
		const convertToInt = deregistration ? 1 : 0;
		const mutationObject = {
			account_checked: account_checked || null,
			action,
			comments,
			company_id: companyId,
			country_id: countryId,
			deregistration: convertToInt,
			latest_followup: latest_followup || null,
			letter2_sent: letter2_sent || null,
			modification_done: modification_done || null,
			modification_request,
			sales_call_made: sales_call_made || null,
			sheet_link,
			outcome,
			agent
		};
		console.log(mutationObject);
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
	}
}