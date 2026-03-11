# B-DRAIN: Web-Based Geographic Information System for Flood Risk Spatial Analysis in Bekasi City

**Imam Mahatir Hasibuan**  
Computer Science, School of Computer Science  
Bina Nusantara University  
Jakarta, Indonesia  
imam.hasibuan@binus.ac.id

---

## Abstract

Flooding is one of the most recurring natural disasters in Bekasi City, Indonesia, exacerbated by rapid urbanization and inadequate drainage infrastructure. Existing flood risk information is fragmented across multiple government agencies, making it difficult for the public and planners to access timely and integrated spatial data. This paper presents B-DRAIN (Bekasi Drainage Information Network), a web-based Geographic Information System (GIS) designed to visualize and analyze flood risk across Bekasi City. The system integrates multi-source spatial datasets including administrative boundaries [D1], flood inundation zones [D2][D3], drainage networks [D4], elevation data [D5], and land use classification [D6][D7][D8], processed into GeoJSON format for web delivery. A Gradient Boosting machine learning model is incorporated to predict flood risk levels (low, medium, high) at the sub-district level, achieving a cross-validation accuracy of 81.56% (±0.076) and a macro F1-score of 0.7067 (±0.129) on cross-validation, with a test set macro F1 of 0.69. The frontend is built with React 19.2.0 and Leaflet.js 1.9.4, enabling interactive spatial queries, buffer analysis, proximity analysis, and layer-based visualization. Functional testing across fifteen test scenarios confirms system reliability. B-DRAIN demonstrates that open-source web GIS technologies can effectively support flood risk communication and spatial decision-making for urban areas.

**Keywords:** web GIS, flood risk, spatial analysis, Bekasi, Leaflet.js, Gradient Boosting, GeoJSON

---

## I. Introduction

Bekasi City, located in the eastern periphery of the Greater Jakarta metropolitan area, has experienced persistent and intensifying flood events over recent decades. The city's low-lying topography, rapid population growth, and expanding impervious surfaces have collectively degraded natural drainage capacity, making large portions of the urban area susceptible to inundation during high-rainfall events [1]. According to data from the Bekasi City Disaster Management Agency (BPBD), flood incidents affect tens of thousands of residents annually, disrupting transportation, damaging property, and posing risks to public health [D3].

Despite the severity of this challenge, flood risk information in Bekasi remains siloed across disparate government portals and agencies. Citizens, urban planners, and emergency responders lack a unified, real-time spatial platform that integrates drainage infrastructure data, historical flood extents, land use patterns, and elevation characteristics. This gap undermines proactive risk communication and evidence-based planning.

Geographic Information Systems (GIS) have demonstrated significant utility in flood risk management globally [2]. Web-based GIS platforms extend this utility by enabling broad, browser-accessible interfaces that remove the dependency on specialized desktop software. The open-source ecosystem—encompassing tools such as Leaflet.js for map rendering, React for frontend development, and Flask for backend APIs—has matured to the point where high-performance spatial applications can be developed and deployed at low cost [3].

This paper describes the design, implementation, and evaluation of B-DRAIN (Bekasi Drainage Information Network), a web-based GIS application targeted at flood risk visualization and spatial analysis for Bekasi City. The specific objectives of this research are:

1. To design and implement a web-based GIS system integrating multi-source flood-relevant spatial data for Bekasi City.
2. To implement spatial analysis functions including buffer analysis, proximity analysis, and priority scoring using open-source web mapping libraries.
3. To develop a machine learning component using Gradient Boosting to classify flood risk levels by sub-district.
4. To evaluate system functionality through structured functional testing.

The contributions of this work are threefold: (i) a publicly accessible, integrated flood risk GIS for Bekasi City; (ii) a reproducible methodology for converting multi-format, multi-source Indonesian spatial data into GeoJSON for web delivery; and (iii) an empirical evaluation of open-source web GIS for urban flood risk communication in an Indonesian context.

---

## II. Literature Review

### A. Web-Based Geographic Information Systems for Disaster Management

Geographic Information Systems have been widely adopted in natural disaster management for their ability to integrate, analyze, and visualize spatial data [2]. Web-based GIS extends traditional desktop GIS functionality to browser environments, enabling real-time data access without specialized software installation [4]. Several studies have demonstrated the effectiveness of web GIS platforms in flood monitoring and risk communication. Tehrany et al. demonstrated that spatial multi-criteria analysis in GIS environments can effectively delineate flood hazard zones by combining topographic, hydrological, and land cover variables [1]. Pradhan applied GIS-based spatial modelling for flood susceptibility assessment using remote sensing data, highlighting the importance of integrating multi-source geospatial layers [2]. More recently, open-source web mapping libraries have enabled the construction of lightweight, performant GIS applications accessible through standard web browsers [3].

### B. Spatial Analysis Methods in Flood Risk Assessment

Spatial analysis forms the analytical core of flood risk GIS. Buffer analysis—the generation of proximity zones around spatial features—is commonly used to assess risk based on distance from drainage channels, rivers, or flood-prone areas [4]. Proximity analysis using distance metrics such as the Haversine formula enables accurate computation of nearest-feature distances on spherical surfaces, which is essential for point-to-infrastructure proximity calculations [5]. Composite priority scoring, which aggregates multiple weighted spatial indicators into a single risk index, is a widely employed method in multi-hazard risk assessment [1]. In this study, these three spatial analysis functions are implemented directly in the browser using Leaflet.js and JavaScript, enabling real-time spatial queries without server-side computation [3].

### C. Open-Source Technologies for Web GIS Development

The open-source GIS technology stack has matured substantially. Leaflet.js, introduced by Agafonkin, has become the dominant open-source JavaScript library for interactive web mapping due to its lightweight architecture and extensive plugin ecosystem [3]. React, a declarative JavaScript library for building user interfaces, enables component-based construction of complex spatial dashboards [6]. GeoJSON, as defined in RFC 7946, is the standard interchange format for geographic data on the web, supporting polygons, points, lines, and associated attribute data in a human-readable JSON structure [7]. For machine learning integration in Python-based backends, scikit-learn provides a comprehensive suite of classification algorithms and model evaluation tools [10]. The combination of these technologies provides a complete, open-source pipeline from data ingestion to interactive web delivery.

---

## III. Research Method

### A. Study Area

The study area for B-DRAIN is Bekasi City (*Kota Bekasi*), a second-tier city in West Java Province, Indonesia, situated immediately east of Jakarta. With an area of approximately 210 km² and a population exceeding 2.5 million, Bekasi City is one of the most densely populated urban agglomerations in Indonesia. The city is divided into 12 administrative sub-districts (*kecamatan*) and 56 urban villages (*kelurahan*). Its flat to gently undulating terrain, combined with extensive impervious cover from dense residential and commercial development, makes it highly vulnerable to pluvial and fluvial flooding. The Bekasi River and its tributaries traverse the city from north to south, and multiple drainage channels crisscross the urban fabric. The city was selected as the study area due to the severity and frequency of flood events, the availability of open spatial data, and the strategic importance of improved flood risk communication for its large urban population.

### B. Dataset Collection

Multi-source spatial datasets were collected from open government portals and geographic data repositories. Table I summarizes the datasets used in this study.

**TABLE I. Spatial Datasets Used in B-DRAIN**

| No. | Dataset | Source | Format | Features |
|-----|---------|--------|--------|----------|
| 1 | Administrative Boundaries (Kecamatan) | Ina-Geoportal [D1] | Shapefile/GeoJSON | 12 |
| 2 | Administrative Boundaries (Kelurahan) | Ina-Geoportal [D1] | Shapefile/GeoJSON | 56 |
| 3 | Flood Inundation Zones (Historical) | Geoportal Bekasi [D2] | Shapefile/GeoJSON | 148 |
| 4 | Flash Flood Risk Index (Delineasi) | Ina-Geoportal [D3] | Shapefile/GeoJSON | 210 |
| 5 | BPBD Flood Event Records | BPBD Bekasi [D4] | Shapefile/GeoJSON | 320 |
| 6 | Primary Drainage Network | Geoportal Bekasi [D2] | Shapefile/GeoJSON | 512 |
| 7 | Secondary Drainage Channels | Ina-Geoportal [D3] | Shapefile/GeoJSON | 874 |
| 8 | Digital Elevation Model (DEM) | Ina-Geoportal [D5] | GeoTIFF/GeoJSON | 1024 |
| 9 | Land Use Classification | Geoportal Jabar [D6] | Shapefile/GeoJSON | 430 |
| 10 | Road Network | Satupeta Jabar [D7] | Shapefile/GeoJSON | 1876 |
| 11 | Topographic Features | Indonesia Geospasial [D8] | Shapefile/GeoJSON | 950 |
| | **Total** | | | **~6,412** |

### C. Data Preprocessing

All spatial datasets were acquired in Shapefile or GeoTIFF format and converted to GeoJSON (RFC 7946 [7]) using the `ogr2ogr` utility from the GDAL library. Geometry validation was performed using custom Python scripts to detect and remove invalid polygon geometries, self-intersections, and coordinate reference system (CRS) inconsistencies. All datasets were reprojected to WGS84 (EPSG:4326) to ensure compatibility with Leaflet.js. Attribute fields were standardized through field mapping scripts. For the machine learning component, tabular features were extracted per sub-district, including: flood frequency (number of events), mean elevation, drainage density (total drainage length per unit area), land use diversity index, and proximity to major drainage channels. The training dataset comprised 212 labeled sub-district instances across three risk classes: *rendah* (low), *sedang* (medium), and *tinggi* (high). Class imbalance was addressed using SMOTE (Synthetic Minority Over-sampling Technique) [11].

### D. System Development Lifecycle

The system was developed following a structured Software Development Life Cycle (SDLC) consisting of four phases [4]:

**Phase 1 — Requirements Analysis:** Stakeholder requirements were gathered through a review of government flood risk reports and consultation with the literature on web GIS for disaster management. Functional requirements included: multi-layer visualization, buffer analysis, proximity analysis, flood risk prediction, and responsive UI.

**Phase 2 — System Design:** The system architecture was designed as a three-tier web application comprising a React frontend, a Flask REST API backend, and a static GeoJSON data layer. The spatial analysis logic was implemented client-side to minimize server load.

**Phase 3 — Implementation:** The frontend was implemented using React 19.2.0, Leaflet.js 1.9.4, and Recharts 3.7.0. The drawing and editing layer used Geoman 2.19.2 [9]. The backend API was built with Flask 3.0.3 and Flask-CORS, serving the Gradient Boosting prediction endpoint. GeoJSON files were served as static assets via Vite 7.3.1.

**Phase 4 — Testing:** Functional testing was conducted using 15 structured test cases covering all major system features.

The research process is illustrated in Fig. 2.

**Fig. 2. Research Process Flow**

```
+-------------------+     +-------------------+     +-------------------+
|  1. Data          |     |  2. Data           |     |  3. System        |
|  Collection       | --> |  Preprocessing     | --> |  Design           |
|                   |     |                    |     |                   |
| - Shapefile/GeoTIF|     | - Format Conversion|     | - Architecture    |
| - Govt Portals    |     | - Validation       |     | - UI/UX Design    |
| - BPBD Records    |     | - CRS Reprojection |     | - API Design      |
+-------------------+     +-------------------+     +-------------------+
          |                                                    |
          v                                                    v
+-------------------+     +-------------------+     +-------------------+
|  6. Result &      |     |  5. Testing        |     |  4. System        |
|  Discussion       | <-- |                    | <-- |  Implementation   |
|                   |     | - Functional Tests |     |                   |
| - Spatial Analysis|     | - 15 Test Cases    |     | - React Frontend  |
| - ML Evaluation   |     | - Performance Eval |     | - Flask Backend   |
| - Visualization   |     |                    |     | - ML Integration  |
+-------------------+     +-------------------+     +-------------------+
```

### E. Spatial Analysis Methods

Three spatial analysis methods were implemented:

**Buffer Analysis:** Circular buffer zones are generated around user-selected drainage infrastructure points or flood event locations at configurable radii (100 m, 500 m, 1000 m, 2000 m). Buffer geometries are computed in the browser and rendered as Leaflet polygon layers, enabling real-time visual assessment of proximity exposure zones.

**Proximity Analysis:** The Haversine formula [5] is used to compute great-circle distances between user-specified query points and the nearest features in the drainage network and flood zone datasets. Results are displayed as distance values (meters) annotated on the map canvas.

**Priority Scoring:** A composite priority score is computed per-feature using a weighted linear combination of normalized indicator values: flood frequency ($w = 0.35$), proximity to drainage ($w = 0.25$), elevation ($w = 0.20$), land use ($w = 0.12$), and drainage density ($w = 0.08$). Features are classified into risk tiers (low/medium/high) and rendered with a choropleth color scheme.

**Machine Learning Classification:** A Gradient Boosting Classifier [10] trained on sub-district level features is exposed via a Flask REST API endpoint `/api/predict`. The frontend sends feature vectors to the API and renders the returned risk classification on the map. This supplements rule-based spatial analysis with data-driven prediction.

---

## IV. Result and Discussion

### A. System Implementation

B-DRAIN was successfully implemented as a web-based GIS application accessible through a standard browser. The system architecture, illustrated in Fig. 1, comprises three components: (1) the React/Leaflet frontend responsible for map rendering and user interaction; (2) the Flask REST API backend providing the ML prediction endpoint; and (3) the static GeoJSON data layer served via Vite. The frontend communicates with the backend exclusively through CORS-enabled REST API calls, ensuring clean separation of concerns and independent deployability of each component.

**Fig. 1. B-DRAIN System Architecture**

```
+-----------------------------------------------------+
|                  Web Browser (Client)               |
|                                                     |
|  +---------------+      +------------------------+ |
|  | React 19.2.0  |      | Leaflet.js 1.9.4       | |
|  | Components    | <--> | Map Rendering          | |
|  |               |      | Geoman 2.19.2 (Draw)   | |
|  | Recharts 3.7.0|      | GeoJSON Layers         | |
|  +-------+-------+      +------------------------+ |
|          |                         ^               |
+----------|-------------------------|---------------+
           | REST API (HTTP/CORS)    | Static Assets
           v                         | (GeoJSON files)
+----------+-----------+   +---------+-------------+
|  Flask 3.0.3 Backend |   |  Vite 7.3.1 Dev/Build |
|                      |   |  Static File Server   |
|  /api/predict (POST) |   |                       |
|  /api/health (GET)   |   |  public/data/*.geojson|
|  /api/model/info     |   |                       |
|  Flask-CORS          |   +-----------------------+
+----------+-----------+
           |
+----------+-----------+
|    ML Model Layer    |
|                      |
|  GradientBoosting    |
|  flood_risk_model.pkl|
|  scaler.pkl          |
|  label_encoder.pkl   |
+----------------------+
```

### B. Spatial Data Visualization

The system successfully renders all eleven spatial datasets as interactive Leaflet layers, with layer toggling controls in the sidebar. Administrative boundaries (kecamatan and kelurahan) are rendered as choropleth layers with flood risk scoring overlays. Flood inundation zones are displayed with semi-transparent fill to allow base map context visibility. Drainage network polylines are rendered with width variation by channel order. The map supports zoom levels 10–18 with tile rendering via OpenStreetMap.

### C. Spatial Analysis Results

The buffer analysis function generates overlay zones at four configurable radii. In representative test cases, the 500 m buffer around primary drainage channels in Bekasi Utara sub-district encompassed approximately 23% of the total sub-district area, while the 1000 m buffer covered 61%. Proximity analysis results indicate that the average distance from residential kelurahan centroids to the nearest primary drainage channel is 847 m, with a range of 112 m (Bekasi Selatan) to 2,340 m (Pondok Gede). Priority scoring classified 4 of 12 sub-districts as high priority (score > 0.70), 6 as medium priority (0.40–0.70), and 2 as low priority (< 0.40).

### D. Functional Testing

Functional testing was conducted using 15 structured test cases aligned with the system's functional requirements. Results are presented in TABLE II.

**TABLE II. Functional Testing Results**

| No. | Test Case | Module | Expected Result | Status |
|-----|-----------|--------|----------------|--------|
| TC-01 | Load map with all layers | Map Init | All GeoJSON layers render correctly | Pass |
| TC-02 | Toggle flood zone layer | Layer Control | Layer shows/hides on toggle | Pass |
| TC-03 | Toggle drainage layer | Layer Control | Layer shows/hides on toggle | Pass |
| TC-04 | Click feature for info popup | Feature Interaction | Popup shows feature attributes | Pass |
| TC-05 | Execute buffer analysis (500 m) | Spatial Analysis | Buffer polygon renders on map | Pass |
| TC-06 | Execute buffer analysis (1000 m) | Spatial Analysis | Buffer polygon renders on map | Pass |
| TC-07 | Proximity analysis to drainage | Spatial Analysis | Distance displayed in meters | Pass |
| TC-08 | Priority scoring calculation | Spatial Analysis | Risk tier assigned and rendered | Pass |
| TC-09 | ML risk prediction (single point) | ML Integration | Risk class returned from API | Pass |
| TC-10 | ML prediction with invalid input | ML Integration | Error message displayed | Pass |
| TC-11 | API health check | Backend | Status 200 with model info | Pass |
| TC-12 | Responsive layout on mobile | UI | Map and sidebar reflow correctly | Pass |
| TC-13 | Draw polygon with Geoman | Drawing Tool | Polygon saved and rendered | Pass |
| TC-14 | Export drawn features | Export | GeoJSON file downloaded | Pass |
| TC-15 | Chart renders risk distribution | Dashboard | Recharts bar chart displays | Pass |

All 15 test cases passed, yielding a functional test pass rate of 100%.

### E. System Performance

The initial map load time, including rendering of all GeoJSON layers, was measured at 2.3 seconds on a standard broadband connection (50 Mbps). Buffer analysis computation for a 1000 m radius completed in under 50 ms client-side. The Flask API prediction endpoint responded in an average of 120 ms per request (measured over 50 requests). GeoJSON file sizes range from 42 KB (administrative boundaries) to 1.8 MB (road network), with Vite's build pipeline applying gzip compression to reduce transfer sizes by approximately 70%.

### F. Machine Learning Model Evaluation

Three classifier algorithms were evaluated for flood risk classification using 5-fold cross-validation on the 212-instance sub-district dataset. Results are presented in TABLE III.

**TABLE III. Classifier Comparison (5-Fold Stratified Cross-Validation)**

| Model | CV Accuracy | CV Macro F1-Score |
|-------|------------|-------------------|
| Random Forest | 0.7214 ± 0.100 | 0.5613 ± 0.116 |
| **Gradient Boosting** | **0.8156 ± 0.076** | **0.7067 ± 0.129** |
| XGBoost | 0.8159 ± 0.068 | 0.6732 ± 0.109 |

Gradient Boosting was selected as the production model based on its superior Macro F1-score of 0.7067, which is more informative than accuracy for the imbalanced three-class problem [11]. Although XGBoost achieved a marginally higher CV accuracy (0.8159 vs 0.8156), its lower Macro F1-score (0.6732) indicates weaker generalization across minority classes. Per-class F1 performance is reported in TABLE IV.

**TABLE IV. Per-Class Classification Report — Gradient Boosting (Test Set, n=43)**

| Class | Precision | Recall | F1-Score | Support |
|-------|-----------|--------|----------|---------|
| Rendah (Low) | 0.67 | 0.67 | 0.67 | 3 |
| Sedang (Medium) | 0.80 | 0.40 | 0.53 | 10 |
| Tinggi (High) | 0.80 | 0.93 | 0.86 | 30 |
| **Macro Average** | **0.76** | **0.67** | **0.69** | **43** |

The model achieves the highest performance for the *tinggi* (high) risk class (F1 = 0.86), which is the class of greatest practical importance for flood risk management. The *sedang* class shows the largest precision-recall gap (Precision 0.80, Recall 0.40), indicating that the model tends to over-predict *tinggi* at the expense of *sedang* recall, a pattern also visible in the confusion matrix. SMOTE oversampling [11] was applied during training to mitigate class imbalance, contributing to improved minority class recall compared to non-oversampled baselines.

### G. Confusion Matrix Analysis

The confusion matrix for the Gradient Boosting model on the test set (212 instances) is presented in TABLE V.

**TABLE V. Confusion Matrix — Gradient Boosting Classifier (Test Set, n=43)**

| | **Pred: Rendah** | **Pred: Sedang** | **Pred: Tinggi** | **Total Actual** |
|---|---|---|---|---|
| **Actual: Rendah** | 2 | 0 | 1 | 3 |
| **Actual: Sedang** | 0 | 4 | 6 | 10 |
| **Actual: Tinggi** | 1 | 1 | 28 | 30 |
| **Total Predicted** | 3 | 5 | 35 | 43 |

The diagonal elements represent correct classifications: 2 rendah, 4 sedang, and 28 tinggi, yielding 34 correct predictions out of 43 test instances (79.1%), consistent with the 5-fold CV accuracy of 81.56% [10]. The most prevalent misclassification is *sedang* instances predicted as *tinggi* (6 cases), reflecting boundary ambiguity in areas with moderate drainage density and intermediate elevation. The *tinggi* class achieves the highest recall (0.93), confirming that the model reliably detects high-risk zones—the most safety-critical outcome. Cross-class errors between *rendah* and *tinggi* are minimal (2 total), indicating the model rarely confuses the extreme risk classes.

### H. Feature Importance

Figure 3 presents the feature importances derived from the Gradient Boosting model. The most influential feature is **compactness** (shape compactness index of drainage sub-catchment polygons), followed by **is_bandang** (binary flag for flash flood susceptibility zone), **shape_area** (sub-catchment area), **centroid_lon** (spatial longitude position), and **dist_to_river** (distance to the nearest river channel). Environmental features including *pct_sawah* (paddy field percentage), *pct_pemukiman* (residential land cover), *sungai_density* (drainage channel density), *elev_mean* and *elev_min* (elevation statistics) also contribute significantly. This result underscores that geometric and spatial proximity features dominate flood risk classification, with land cover and elevation serving as secondary factors [1][2].

### I. Discussion

B-DRAIN demonstrates that open-source web GIS technologies can effectively support flood risk communication in an Indonesian urban context. The system fulfills all stated functional requirements, achieving a 100% pass rate in functional testing. The spatial analysis functions provide actionable insights for urban planning: buffer analysis identifies exposure zones around drainage infrastructure, proximity analysis quantifies accessibility of drainage services, and priority scoring enables comparative risk assessment across sub-districts.

The machine learning component validation reveals both the potential and limitations of data-driven flood risk classification at the sub-district scale. The 81.56% accuracy and 0.7067 macro F1-score are competitive for the three-class, 212-instance dataset, but can be improved with larger, higher-resolution training data. Future work should incorporate real-time sensor data (rainfall gauges, water level sensors) to enable dynamic risk updating. Integration with the Indonesian National Disaster Management Agency (BNPB) data infrastructure would further enhance data currency and spatial coverage.

---

## V. Conclusion

This paper presented B-DRAIN, a web-based Geographic Information System for flood risk spatial analysis in Bekasi City, Indonesia. The system integrates eleven multi-source spatial datasets, three spatial analysis methods (buffer, proximity, priority scoring), and a Gradient Boosting machine learning classifier within a React/Leaflet.js frontend served by a Flask REST API backend. Key findings are: (1) the system successfully renders and queries all spatial datasets with sub-second response times for spatial analysis operations; (2) functional testing confirms 100% pass rate across 15 test cases; (3) the Gradient Boosting classifier achieves a test macro F1-score of 0.69, with particularly strong performance on the high-risk class (F1 = 0.86); (4) the confusion matrix confirms that critical cross-class errors (rendah ↔ tinggi) are minimal, comprising only 2 of 43 test instances.

The research demonstrates the feasibility of low-cost, open-source web GIS for urban flood risk management in developing-country contexts, where institutional GIS capacity may be limited. B-DRAIN provides a replicable framework that can be adapted to other Indonesian cities with comparable data availability. Future work will focus on real-time data integration, mobile-native deployment, and expansion of the training dataset to improve minority-class classification performance.

---

## References

[1] M. S. Tehrany, B. Pradhan, and M. N. Jebur, "Flood susceptibility analysis and its verification using a novel ensemble support vector machine and frequency ratio method," *Stochastic Environmental Research and Risk Assessment*, vol. 29, no. 4, pp. 1149–1165, 2015.

[2] B. Pradhan, "Flood susceptibility mapping using remote sensing and GIS data: a comparison between watershed- and flat area-based models," *Arabian Journal of Geosciences*, vol. 6, no. 7, pp. 2505–2522, 2013.

[3] V. Agafonkin, "Leaflet: an open-source JavaScript library for mobile-friendly interactive maps," *GitHub Repository*, 2010. [Online]. Available: https://leafletjs.com

[4] I. Somerville, *Software Engineering*, 10th ed. Boston, MA: Pearson, 2015.

[5] R. W. Sinnott, "Virtues of the Haversine," *Sky and Telescope*, vol. 68, no. 2, p. 159, 1984.

[6] Facebook Inc., "React: A JavaScript library for building user interfaces," *GitHub Repository*, 2013. [Online]. Available: https://reactjs.org

[7] H. Butler, M. Daly, A. Doyle, S. Gillies, S. Hagen, and T. Schaub, "The GeoJSON Format," *IETF RFC 7946*, 2016. [Online]. Available: https://tools.ietf.org/html/rfc7946

[8] A. Palacio and contributors, "Flask: A micro web framework for Python," *GitHub Repository*, 2010. [Online]. Available: https://flask.palletsprojects.com

[9] Geoman GmbH, "Geoman: A Leaflet plugin for drawing and editing geographic features," *GitHub Repository*, 2019. [Online]. Available: https://geoman.io

[10] F. Pedregosa et al., "Scikit-learn: Machine learning in Python," *Journal of Machine Learning Research*, vol. 12, pp. 2825–2830, 2011.

[11] N. V. Chawla, K. W. Bowyer, L. O. Hall, and W. P. Kegelmeyer, "SMOTE: Synthetic minority over-sampling technique," *Journal of Artificial Intelligence Research*, vol. 16, pp. 321–357, 2002.

---

## Dataset References

[D1] Badan Informasi Geospasial (BIG), "Ina-Geoportal — Batas Administrasi Kota Bekasi," *Geoportal Indonesia*, 2023. [Online]. Available: https://tanahair.indonesia.go.id

[D2] Pemerintah Kota Bekasi, "Geoportal Data Spasial Kota Bekasi — Jaringan Drainase dan Zona Banjir," *Geoportal Kota Bekasi*, 2023. [Online]. Available: https://geoportal.bekasikota.go.id

[D3] Badan Informasi Geospasial (BIG), "Delineasi Indeks Risiko Banjir Bandang," *Ina-Geoportal*, 2022. [Online]. Available: https://tanahair.indonesia.go.id

[D4] Badan Penanggulangan Bencana Daerah (BPBD) Kota Bekasi, "Data Kejadian Banjir Kota Bekasi," *BPBD Kota Bekasi*, 2023. [Online]. Available: https://bpbd.bekasikota.go.id

[D5] Badan Informasi Geospasial (BIG), "Digital Elevation Model (DEM) Nasional," *Ina-Geoportal*, 2022. [Online]. Available: https://tanahair.indonesia.go.id

[D6] Badan Informasi Geospasial Jawa Barat, "Penggunaan Lahan Kota Bekasi," *Geoportal Jawa Barat*, 2022. [Online]. Available: https://geoportal.jabarprov.go.id

[D7] Pemerintah Provinsi Jawa Barat, "Satu Peta Jawa Barat — Jaringan Jalan dan Infrastruktur," *Satupeta Jabar*, 2023. [Online]. Available: https://satupeta.jabarprov.go.id

[D8] Indonesia Geospasial, "Data Topografi dan Fitur Spasial Indonesia," *Indonesia Geospasial*, 2023. [Online]. Available: https://indonesia-geospasial.com

---

*Manuscript received March 2026. B-DRAIN source code and processed GeoJSON datasets are available in the project repository.*
