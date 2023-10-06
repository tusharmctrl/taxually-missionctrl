export default {
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
	handleShowMissingDataButton: async(id, country_id) => {
		await GetMissingDocsInformation.run({id:id, country_id:country_id}).then(resp => console.log(resp))
		showModal("Modal1")
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
	getMissingDocuments: () => {
		const allDocTypes = [];
		const getCurrentDocs = GetMissingDocsInformation.data.data.prod.Companies_by_pk.Documents
		getCurrentDocs.forEach((documents) => {
			if(!allDocTypes.some(doc => doc.documentType === documents.DocumentType.NameEN)){
				allDocTypes.push({id: documents.Id, documentType: documents.DocumentType.NameEN, missing: false})
			}
		})
		const requiredDocs = GetMissingDocsInformation.data.data.prod.missionctrl_track_missing_docs
		const missingDocs = [];
		requiredDocs.forEach((doc) => {
			const hasAlreadyBeenAdded = allDocTypes.some(existingDoc => existingDoc.documentType === doc.DocumentType.NameEN)
			if(!hasAlreadyBeenAdded){
				missingDocs.push({id: doc.DocumentType.Id, documentType: doc.DocumentType.NameEN, missing: true})
			}
		})
		return missingDocs
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
	}
}