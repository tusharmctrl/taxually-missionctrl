export default {
	onLoad: async() => {
		await Promise.all([
			GetCompanyData.run(),
			GetOfflineSubscription.run()
		])
	},
	executeCompaniesOnChange: async() => {
		await GetCompanyData.run();
		Utils.getCompaniesData();
	},
	getCompaniesData: () => {
		if(!GetCompanyData.isLoading && !GetOfflineSubscription.isLoading) {
			const companyData = GetCompanyData.data.data.prod.missionctrl_track_company_status_wise;
			const jurisdictionWiseData = [];
			companyData.forEach((companyData) => {
				const nameOfTheCompany = companyData.Company.LegalNameOfBusiness;
				const offlineSubscriptions = GetOfflineSubscription.data.data.prod.missionctrl_offline_subscriptions.filter(sub => sub.company_id === companyData.Company.Id);
				offlineSubscriptions.forEach(subscribed => {
					const jurisdictionObject = {Name: nameOfTheCompany , JurisdictionCountry: subscribed.Country.NameEN, countryId:subscribed.country_id, type: "OFFLINE"}
					jurisdictionWiseData.push(jurisdictionObject);
				})
				companyData.Company.current_orders.forEach(subscribed => {
					const jurisdictionObject = {Name: nameOfTheCompany, JurisdictionCountry: subscribed.country.NameEN, countryId: subscribed.country.Id, type: "ONLINE"}
					jurisdictionWiseData.push(jurisdictionObject)
				})
			})
			return jurisdictionWiseData;
		} 
	}
}