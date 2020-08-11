require('dotenv').config()
const yaml = require('js-yaml');
const axios = require('axios').default;
const request = require('request');
const svg2img = require('svg2img');
const { render } = require('mustache');
const { encode } = require('js-base64');
const { readFile, existsSync, mkdirSync, writeFileSync } = require('fs');
const getRepoLanguages = require('./graphql/get-repo-languages.js');

const { PerformanceObserver, performance } = require('perf_hooks');


// async function repoLanguages() {
//   const graphQLClient = new GraphQLClient('https://api.github.com/graphql', {
//     headers: {
//         Authorization: `Bearer ${process.env.JL_TOKEN}`
//     }
//   });

//   const data = await graphQLClient.request(getRepoLanguages)

//   let languages = [];
//   data.viewer.repositories.edges.forEach(repo => {
//     console.log(repo.node.name)
//     repo.node.languages.edges.forEach(edge => {
//       const pos = languages.map(e => e.name).indexOf(edge.node.name);
//       if (pos >= 0) languages[pos].size += parseInt(edge.size)
//       else {
//         languages.push({ name: edge.node.name, size: edge.size, color: edge.node.color })
//       }
//     })
//   })

//   languages.sort((a, b) => b.size - a.size)
//   languages = languages.slice(0, 5)

//   let totalSize = languages.map(e => e.size).reduce((a,b) => a + b, 0)
//   languages.forEach(lang => {
//     lang.percent = Math.round(lang.size / totalSize * 1000) / 10
//     lang.imgPath = `images/${lang.name}.png`
//     generateImg(lang.name, lang.color, lang.percent, lang.imgPath)
//   })

//   return languages
// }

async function getLanguageColors() {
  return new Promise((resolve, reject) => { 
    request.get('https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml', (error, resp, body) => {
      if (error) reject
      resolve(yaml.safeLoad(body))
    })
  })
}

async function getWakaStats() {
  const wakatime = axios.create({
    baseURL: 'https://wakatime.com/api/v1',
    headers: {
      common: {
        Authorization: `Basic ${encode(process.env.WAKA_TOKEN)}`
      }
    }
  });

  let [response, ghLanguages] = await Promise.all([
    wakatime.get('/users/JonatanLindstroom/stats/last_7_days'), 
    getLanguageColors()]
  );

  let languages = response.data.data.languages.slice(0, 5)
  languages.forEach(lang => {
    lang.imgPath = `images/${lang.name}.svg`
    if (ghLanguages[lang.name]) {
      lang.color = ghLanguages[lang.name].color
      if (!lang.color && ghLanguages[lang.name].group) {
        lang.color = ghLanguages[ghLanguages[lang.name].group].color
      }
    }
    if (!lang.color) lang.color = '#'+(0x1000000+(Math.random())*0xffffff).toString(16).substr(1,6)

    console.log('WakaTime Stats')
    console.log(lang.name, ' with color ', lang.color, ' has: ', lang.percent)
    generateImg(lang.name, lang.color, lang.percent, lang.imgPath)
  })

  return languages
}

function generateImg(name, color, percent, path) {
  if (!existsSync('images')) mkdirSync('images')
  
  const DATA = {
    name,
    color,
    percent,
    progress: percent * 2.5
  }

  readFile('./progressBar.mustache', (err, data) =>  {
    if (err) throw err;
    let output = render(data.toString(), DATA);
    writeFileSync(path, output)
  });
}

function generateReadMe() {
  getWakaStats().then(languages => {
    const DATA = {
      languages, 
      date: new Date().toLocaleString('en-CA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit', 
        minute:'2-digit',
        hour12: false,
        timeZone: 'Europe/Stockholm',
        timeZoneName: 'short'
      })
    };
    
    readFile('./main.mustache', (err, data) =>  {
      if (err) throw err;
      const output = render(data.toString(), DATA);
      writeFileSync('README.md', output);
    });
  })
}

generateReadMe();
