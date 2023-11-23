export default {
	onLoad: () => {
		GetCompanyData.run()
			.then(() => GetOfflineSubscription.run())
			.then(() => GetLastRecord.run())
			.catch((error) => {
			console.log(error)
		});
	},
	RedirectToCompanyDetailPage: () => {
		navigateTo("CompanyDetails", {companyId: CompanyListing.selectedRow.Id, countryId: CompanyListing.selectedRow.Country})
	},
	statusLookup: () => {
		return GetAllStatuses.data.data.prod.missionctrl_track_companies_by_status.map(l => {
			return {value: l.id, label: Lib.statusLabel(l) }
		})
	},
	wavesLookup: () => {
		return GetAllWaves.data.data.prod.missionctrl_waves.map(l => {
			return {value: l.id, label: Lib.waveLabel(l) }
		})
	},
	getCountriesLookup: () => {
		return GetCountries.data.data.prod.Countries.map(country => {
			return {value: country.Id, label: country.NameEN }
		})
	},
	getCountOfCompaniesStatusWise: () => {
		const statusWiseCompanyData = GetCountOfCompaniesStatusWise.data.data.prod.missionctrl_track_company_status_wise.map(item => item.CompanyStatus.name);;
		const statusCounts = statusWiseCompanyData.reduce((counts, statusName) => {
			counts[statusName] = (counts[statusName] || 0) + 1;
			return counts;
		}, {});

		const statusWiseCompanyCountList = Object.keys(statusCounts).map(statusName => ({
			title: statusName,
			value: statusCounts[statusName],
		}));

		return statusWiseCompanyCountList;
	},
	createANewWave: async() => {
		try{
			if(WaveNameInput.inputText !== ""){
				await CreateANewWave.run({wave_data: {wave_name: WaveNameInput.inputText}})
				await GetAllWaves.run()
				WaveNameInput.text = ""
				showAlert("New wave has been created!", "success")
			} else{
				showAlert("Invalid Input", "error")
			}
		} catch(error){
			console.log(error)
		}
	},
	assignCompaniesToWave: async () => {
		try {
			const selectedCompanyIds = CompanyListing.selectedRows.map((company) => company.Id)
			const currentWaveId = AssignWave.selectedOptionValue;
			if(currentWaveId){
				await UpdateClientWaves.run({company_ids: selectedCompanyIds, wave_id: currentWaveId});
				await GetCompanyData.run()
				CompanyListing.selectedRows = []
				showAlert(`Selected clients have been assigned to ${AssignWave.selectedOptionLabel}`, "success")
			}
		} catch(error){
			console.log(error);
		}
	},
	createAQueryForSubscribedData: () => {
		const data = SubscriptionCountries.selectedOptionValues;
		if(data.length) {
			return { "Company": { "current_orders": { "CountryId": { "_in": data } } } }
		} else {
			return {}
		}
	},
	executeDataForSubscibedData: async() => {
		await GetCompanyData.run()
	},
	refershCompanies: async() => {
		await GetRestOfTheCompanies.run();
		const companies = GetRestOfTheCompanies.data.data.prod.Companies;
		if(companies.length) {
			const newObjects = companies.map(company => {
				return {
					company_id: company.Id,
					status_id: 3,
					wave_id: 5
				}
			})
			await AddNewCompaniesTracking.run({objects: newObjects}).then(res => res.data ? showAlert("Companies are now synced!", "success") : showAlert("Something went wrong", "error"))
			await GetLastRecord.run()
		} else {
			showAlert("Companies are already synced!", "info")
		}
	},
	getLastIdOfCompanyFromTrackingTable: () => {
		const lastCompanyId = GetLastRecord.data.data.prod.missionctrl_track_company_status_wise;
		return lastCompanyId[0].company_id
	},
	getCompaniesData: () => {
		if(!GetCompanyData.isLoading && !GetOfflineSubscription.isLoading) {
			const companyData = GetCompanyData.data.data.prod.missionctrl_track_company_status_wise;
			const formattedCompanyData = companyData.map((companyData) => {
				const offlineSubscriptions = GetOfflineSubscription.data.data.prod.missionctrl_offline_subscriptions.filter(sub => sub.company_id === companyData.Company.Id).map(sub => sub.Country.NameEN)
				const onlineSubscriptions = companyData.Company.current_orders.map(company => company.country.NameEN)
				const allSubs = [...offlineSubscriptions, ...onlineSubscriptions].join(", ")
				return {
					Id: companyData.Company.Id,
					Name: companyData.Company.LegalNameOfBusiness,
					SubscribedCountries: allSubs,
					Wave: companyData.Wave.wave_name,
					Status: companyData.CompanyStatus.name,
					Country: companyData.Company.Country.Id,
					EstablishedCountry: companyData.Company.Country.NameEN
				}
			})
			return formattedCompanyData;
		} 
	}
}