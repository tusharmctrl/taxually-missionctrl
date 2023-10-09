export default {
	genders: {
		"1": "Male",
		"2": "Female"
	},
	marketPlaces: {
		"1": "Amazon",
		"2": "eBay",
		"3": "AliBaba",
		"4": "Other",
		"5": "Shopify"
	},
	products: {
		"1": "Fashion/Accessories/Jewelery",
		"2": "Electronics/Computer/Office",
		"3": "Collectibles/Art/Stationery",
		"4": "Home/Garden/Tools",
		"5": "Sporting goods/Outdoors",
		"6": "Kitchen/Dining",
		"7": "Books/Audio",
		"8": "Food/Grocery",
		"9": "Automotive/Industrial",
		"10": "Beauty/Health",
		"11": "Music/Movies/Games",
		"12": "Toys/Kids/Baby"
	},
	position: {
		"1": "Company Director",
		"2": "Managing Director",
		"3": "Chief Executive Officer",
		"4": "Other"
	},
	boolean: {
		"0": "NO",
		"1": "YES"
	},
	identification: {
		"1": "Identity card",
		"2": "Passport"
	},
	LegalStatus: {
		"1": "Company",
		"2": "Individual", 
		"3" : "Partnership"
	},
	documentStatus: {
		"1": "Missing",
		"2": "Requires Signature",
		"3": "No Signature Required",
		"4": "Signed",
		"5": "Correct"
	},
	getCountryName (id) {
		const countries = AdditionalInformation.data.data.prod.Countries;
		const countryOfId = countries.filter((country) => country.Id === id)
		return countryOfId[0].NameEN;
	},
	getDocumentTypeName (id) {
		const documentTypes = AdditionalInformation.data.data.prod.DocumentTypes;
		const documentTypeOfId = documentTypes.filter((docType) => docType.Id === id)
		return documentTypeOfId[0].NameEN;
	},
	getFrequencyName (id) {
		const frequencies = AdditionalInformation.data.data.prod.tmp_ReturnFrequencies;
		const frequencyOfId = frequencies.filter((frequency) => frequency.ReturnFrequencyId === id)
		return frequencyOfId[0].ReturnFrequencyName
	},
	meaningfulNamesOfQuestionnaireData (name) {
		const dataMaxtrix = {
			"ContactName": "Contact Name",
			"CountryOfIncorporation": "Country of Seat",
			"RegisteredAddress_countryId": "Country",
			"RegisteredAddress_zipCode": "Zip Code",
			"RegisteredAddress_city": "City",
			"RegisteredAddress_street": "Street",
			"RegisteredAddress_houseNumber": "House Number",
			"LegalRepresentative_Name_firstName": "Legal Representative - First Name",
			"LegalRepresentative_Name_lastName": "Legal Representative - Last Name",
			"LegalRepresentative_BirthDate": "Legal Representative - Birthday",
			"LegalRepresentative_Gender": "Legal Representative - Gender",
			"LegalRepresentative_Position": "Legal Representative - Position",
			"NACE_Code": "NACE Code",
			"LegalRepresentative_HomeAddress_countryId": "Legal Representative - Country",
			"LegalRepresentative_HomeAddress_zipCode": "Legal Representative - ZIP",
			"LegalRepresentative_HomeAddress_city": "Legal Representative - City",
			"LegalRepresentative_HomeAddress_street": "Legal Representative - Street", 
			"LegalRepresentative_HomeAddress_houseNumber": "Legal Representative - House Number",
			"LegalRepresentative_BirthPlace": "Legal Representative - Birth Place",
			"LegalRepresentative_CountryOfBirth": "Legal Representative - Country of Birth", 
			"LegalRepresentative_Nationality": "Legal Representative - Nationality", 
			"LegalRepresentative_PersonalIdentificationType": "Legal Representative - Identification",
			"LegalRepresentative_PersonalIdentificationNumber": "Legal Representative - Personal ID number",
			"LegalRepresentative_Phone": "Legal Representative - Phone Number",
			"LegalRepresentative_Email": "Legal Representative - Email",
			"LegalRepresentative_IsPoliticallyExposed": "Legal Representative - Is Politically Exposed?",
			"BankName": "Bank Name",
			"NeedEarlierVatReg": "Needs Earlier Vat Registration?"
		}
		return dataMaxtrix[name] ?? name
	}
}