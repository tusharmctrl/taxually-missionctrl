// import data from "./JurisdictionData.json"
const data = require("./JurisdictionData.json")
const axios = require('axios');
const fs = require("fs")
const convertToDate = (dateString) => {
  if(dateString) {
      var parts = dateString.split('/');
      var formattedDate = new Date(Date.UTC(parts[2], parts[1] - 1, parts[0]));
      return formattedDate;
  }
  return null;
}


const dataToBeInserted = data.map(element => {
    return {
        company_id: element.companyId,
        country_id: element.countryId,
        comments: element.comments,
        sheet_link: element.sheet_link,
        account_checked: convertToDate(element.account_checked),
        letter2_sent: convertToDate(element.letter2_sent),
        latest_followup: convertToDate(element.latest_followup),
        action: element.action,
        modification_done: convertToDate(element.modification_done),
        sales_call_made: convertToDate(element.sales_call_made),
        outcome: element.outcome,
        agent: element.agent,
        modification_request: element.modification_request,
        deregistration: element.deregistration,
        application_submitted_to_ta: convertToDate(element.sales_call_made)
    }
})



// Replace with your GraphQL server endpoint.
const graphqlEndpoint = 'https://hasura.taxually.mctrl.app/v1/graphql';

// Define your GraphQL mutation query.
const mutationQuery = `
mutation AddJurisdictionTracking($objects: [missionctrl_jurisdiction_tracking_insert_input!]!) {
    prod {
      insert_missionctrl_jurisdiction_tracking(objects: $objects) {
        returning {
          id
        }
      }
    }
  }
  
`;

// Set your request headers.
const headers = {
  'Content-Type': 'application/json',
  'x-hasura-admin-secret': ''
};

// Send the POST request to the GraphQL server.
const partialData = dataToBeInserted.slice(3000, 3200)
console.log(partialData);
// axios.post(graphqlEndpoint, { query: mutationQuery, variables: {objects: partialData}  }, { headers })
//   .then(response => {
//     console.log('Mutation response:', response.data);
//   })
//   .catch(error => {
//     console.error('Error:', error);
//   });

// fs.writeFileSync(
//     "FinalData.json",
//     JSON.stringify(dataToBeInserted, null, 2) + "\n"
//   );
