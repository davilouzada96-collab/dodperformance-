import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  clinicalTopics,
  clinicalTopicsById,
  defaultLibraryGroups,
  englishSearchTerms,
  phraseTranslations,
  ptBrSearchTerms,
  searchTermPairs,
  wordTranslations,
} from "../clinical-taxonomy.js";
import { createPaper, paperSourceUrl } from "../paper-contract.js";
import { researchCards } from "../scientific-library-data.js";
import { evaluateClinicalInput, normalizeClinicalSearchTopic } from "../clinico/clinical-flow.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appFiles = ["app.js", "clinico/app.js"];

assert.equal(new Set(clinicalTopics.map((topic) => topic.id)).size, clinicalTopics.length, "ClinicalTopic.id duplicado");
clinicalTopics.forEach((topic) => {
  assert.ok(topic.id && topic.labelPtBr && topic.terms.length, `tópico inválido: ${topic.id}`);
  if (topic.parentId) assert.ok(clinicalTopicsById.has(topic.parentId), `parentId órfão: ${topic.id}`);
});
defaultLibraryGroups.forEach((group) => group.topicIds.forEach((id) => {
  assert.ok(clinicalTopicsById.has(id), `grupo ${group.id} referencia ${id} inexistente`);
}));

assert.equal(searchTermPairs.length, 132, "cobertura PT-BR/EN alterada");
assert.equal(Object.keys(ptBrSearchTerms).length, 132, "alias PT-BR duplicado ou ausente");
assert.equal(englishSearchTerms.length, 79, "cobertura de busca em inglês alterada");
assert.equal(Object.keys(phraseTranslations).length, 51, "cobertura de frases alterada");
assert.equal(Object.keys(wordTranslations).length, 83, "cobertura de palavras alterada");

for (const file of appFiles) {
  const source = readFileSync(resolve(root, file), "utf8");
  for (const declaration of ["ptBrSearchTerms", "englishSearchTerms", "ptBrPhraseTranslations", "ptBrWordTranslations", "ptBrConceptCatalog"]) {
    assert.ok(!source.includes(`const ${declaration}`), `${file} recriou ${declaration}`);
  }
  assert.ok(source.includes("clinical-taxonomy.js"), `${file} não consome a taxonomia`);
  assert.ok(source.includes("paper-contract.js"), `${file} não consome o contrato Paper`);
}

assert.equal(researchCards.length, 24, "quantidade de cards curados alterada");
researchCards.forEach((card) => {
  assert.ok(card.clinicalTopicIds?.length, `card sem clinicalTopicIds: ${card.id}`);
  card.clinicalTopicIds.forEach((id) => assert.ok(clinicalTopicsById.has(id), `card ${card.id} referencia ${id} inexistente`));
});
const sample = createPaper({ origin: "curated", id: researchCards[0].id, title: researchCards[0].title, sourceUrl: researchCards[0].source });
assert.equal(sample.year, null);
assert.deepEqual(sample.authors, []);
assert.equal(paperSourceUrl(sample), researchCards[0].source);

assert.equal(normalizeClinicalSearchTopic("dor torácica"), "chest pain", "adaptação clínica PT-BR/EN divergente");
const incompleteClinicalCase = evaluateClinicalInput({
  age: "",
  symptom: "",
  durationDays: "",
  severity: "",
  fever: false,
  dyspnea: false,
  chestPain: false,
  dehydration: false,
  pregnancy: false,
  immunosuppression: false,
});
const alertClinicalCase = evaluateClinicalInput({
  age: "42",
  symptom: "dor torácica",
  durationDays: "1",
  severity: "Intensa",
  fever: false,
  dyspnea: false,
  chestPain: true,
  dehydration: false,
  pregnancy: false,
  immunosuppression: false,
});
assert.equal(incompleteClinicalCase.status, "incomplete", "caso incompleto não foi bloqueado");
assert.equal(alertClinicalCase.status, "alert", "sinal clínico informado não gerou alerta");

const clinicalHtml = readFileSync(resolve(root, "clinico/index.html"), "utf8");
const clinicalApp = readFileSync(resolve(root, "clinico/app.js"), "utf8");
const libraryHtml = readFileSync(resolve(root, "index.html"), "utf8");
const libraryApp = readFileSync(resolve(root, "app.js"), "utf8");
assert.ok(clinicalHtml.includes("Resultado estruturado"), "fluxo clínico estruturado ausente");
assert.ok(!clinicalHtml.includes('class="cards-grid"'), "grade de cards ainda presente no Clínico");
assert.ok(clinicalHtml.includes('<option value="pubmed" selected>PubMed</option>'), "Clínico não está fixado no PubMed");
assert.ok(!clinicalApp.includes("output_data_1779051008"), "base local de machine learning ainda referenciada pelo Clínico");
assert.ok(!/OpenAlex|openalex/.test(clinicalApp), "Clínico ainda contém integração OpenAlex");
assert.ok(libraryHtml.includes('<option value="pubmed" selected>PubMed + MeSH</option>'), "biblioteca não prioriza PubMed + MeSH");
assert.ok(libraryHtml.includes('<option value="100" selected>100</option>'), "biblioteca não oferece carga científica ampliada");
assert.ok(libraryApp.includes("await searchScientific();"), "busca da biblioteca não consulta a base científica");

const expectedEcgTopicIds = [
  "ecg_technical",
  "ecg_rate_regularity",
  "ecg_rhythm",
  "ecg_axis",
  "ecg_conduction_intervals",
  "ecg_qrs_morphology",
  "ecg_st_t_injury",
  "ecg_overload_remodeling",
];
const ecgHtml = readFileSync(resolve(root, "dodperoformance.main/ECG/index.html"), "utf8");
const ecgSignal = readFileSync(resolve(root, "dodperoformance.main/ECG/ecg-signal.js"), "utf8");
const ecgHtmlTopicIds = [...ecgHtml.matchAll(/data-axis="(ecg_[^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(ecgHtmlTopicIds, expectedEcgTopicIds, "eixos ECG do HTML divergiram do contrato");
expectedEcgTopicIds.forEach((id) => {
  assert.ok(clinicalTopicsById.has(id), `eixo ECG sem ClinicalTopic: ${id}`);
  assert.ok(ecgSignal.includes(`${id}:`), `análise ECG não produz o eixo ${id}`);
});

function verifyRelativeImports(entryFile) {
  const source = readFileSync(entryFile, "utf8");
  const imports = [...source.matchAll(/from\s+["'](\.[^"']+)["']/g)].map((match) => match[1].split("?")[0]);
  imports.forEach((specifier) => {
    const target = resolve(dirname(entryFile), specifier);
    assert.ok(existsSync(target), `import ausente: ${entryFile} -> ${specifier}`);
  });
}

function verifyHtmlReferences(entryFile) {
  const source = readFileSync(entryFile, "utf8");
  const references = [...source.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map((match) => match[1]);

  references.forEach((reference) => {
    if (/^(?:#|https?:|mailto:|tel:|data:|\/)/i.test(reference)) return;

    const cleanReference = reference.split(/[?#]/, 1)[0];
    if (!cleanReference) return;

    const target = resolve(dirname(entryFile), cleanReference);
    const resolvedTarget = cleanReference.endsWith("/") ? resolve(target, "index.html") : target;
    assert.ok(existsSync(resolvedTarget), `recurso ausente: ${entryFile} -> ${reference}`);
  });
}

if (process.argv.includes("--public")) {
  const requiredPublicFiles = [
    "public/index.html",
    "public/app.js",
    "public/styles.css",
    "public/favicon.svg",
    "public/_headers",
    "public/clinical-taxonomy.js",
    "public/paper-contract.js",
    "public/scientific-library-data.js",
    "public/clinico/index.html",
    "public/clinico/clinical-flow.js",
    "public/clinico/clinical-ui.js",
    "public/dodperoformance.main/ECG/index.html",
  ];
  requiredPublicFiles.forEach((file) => assert.ok(existsSync(resolve(root, file)), `arquivo público ausente: ${file}`));

  ["public/app.js", "public/clinico/app.js", "public/dodperoformance.main/ECG/workbench.js"]
    .map((file) => resolve(root, file))
    .forEach(verifyRelativeImports);

  ["public/index.html", "public/clinico/index.html", "public/dodperoformance.main/ECG/index.html"]
    .map((file) => resolve(root, file))
    .forEach(verifyHtmlReferences);

  assert.ok(!existsSync(resolve(root, "public/dodperoformance.main/clinico")), "rota clínica duplicada foi publicada");
  assert.ok(!existsSync(resolve(root, "public/clinico/output_data_1779051008.json")), "base local obsoleta foi publicada");
  ["README_DEPLOY.md", "clinico-gate.js", "wrangler.toml"].forEach((file) => {
    assert.ok(!existsSync(resolve(root, "public/clinico", file)), `arquivo interno exposto no pacote: clinico/${file}`);
  });
}

console.log(`Arquitetura válida: ${clinicalTopics.length} tópicos, ${researchCards.length} cards, cobertura 132/51/83.`);
