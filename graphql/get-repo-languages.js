module.exports = `{ viewer {
    repositories(first: 100, ownerAffiliations: OWNER) {
      edges {
        node {
          name
          updatedAt
          languages(first: 10) {
            edges {
              size
              node {
                color
                id
                name
              }
            }
          }
        }
      }
    }
  }
}`;