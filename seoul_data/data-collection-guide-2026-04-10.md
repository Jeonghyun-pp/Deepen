# 안전귀가Navi — 데이터 수집 가이드

> 2026 서울시 빅데이터 활용 경진대회 · 창업 부문
> 작성일: 2026-04-10
> 관련 문서: `ml-model-design-2026-04-10.md` (섹션 5 데이터 카탈로그)

---

## 0. 이 문서의 목적

`ml-model-design-2026-04-10.md`에서 확정된 26종 데이터셋을 **실제로 어떻게 수집하는가**에 대한 실무 매뉴얼. 팀원 누구나 이 문서만 보고 데이터 수집을 시작할 수 있도록 작성.

---

## 1. Step 0 — 계정·키 발급 (최우선)

데이터 수집 전에 반드시 발급해야 할 계정·키. **모두 무료, 대부분 즉시 발급**.

| # | 사이트 | URL | 얻을 것 | 소요 시간 |
|---|---|---|---|---|
| 1 | 서울 열린데이터광장 | data.seoul.go.kr | 회원가입 + OpenAPI 인증키 | 5분 |
| 2 | 공공데이터포털 | data.go.kr | 회원가입 + 일반 인증키 | 5분 |
| 3 | LOCALDATA | localdata.go.kr | 공공데이터포털 계정 연동 | 3분 |
| 4 | 국토부 실거래가 | data.go.kr에서 활용신청 | 실거래가 전용 키 | 10분 |
| 5 | KASI 천문연 | astro.kasi.re.kr | Open API 키 (일출·일몰) | 10분 |
| 6 | 기상청 API 허브 | apihub.kma.go.kr | 인증키 | 5분 |
| 7 | 카카오 디벨로퍼스 | developers.kakao.com | REST API 키 (지오코딩·지도) | 10분 |
| 8 | 서울 빅데이터캠퍼스 | bigdata.seoul.go.kr | 방문 신청 제출 (선택) | 10분 |

### 키 관리 규칙

`.env` 파일에 저장, `.gitignore`에 `.env` 추가.

```env
SEOUL_OPENAPI_KEY=...
DATA_GO_KR_KEY=...
MOLIT_KEY=...
KAKAO_REST_KEY=...
KASI_KEY=...
KMA_KEY=...
```

팀원 공유는 **별도 보안 채널**로. Slack DM·이메일 금지, Notion의 비공개 페이지 또는 Vault 권장.

---

## 2. 수집 방법별 가이드

### 방법 ① — 서울 열린데이터광장 파일 다운로드

가장 쉬운 수집 방법. 브라우저만 있으면 됨.

#### 절차
1. `data.seoul.go.kr` 상단 검색창에 **데이터셋 이름** 또는 **ID** 입력
2. 데이터셋 상세 페이지 → **"Sheet"** 또는 **"File"** 탭
3. 파일 포맷 선택 (CSV 권장, Shapefile은 ZIP으로 제공)
4. **"다운로드"** 버튼 클릭

#### 이 방법으로 수집할 데이터

| ID | 이름 | 포맷 | 비고 |
|---|---|---|---|
| **OA-21695** ★ | 안심귀갓길 경로 | SHP/Excel | ZIP 풀면 .shp/.dbf/.shx/.prj 세트 |
| OA-22205 | 가로등 위치 | CSV | ~0.65MB, API 없음 |
| OA-2722 | 자치구별 목적별 CCTV | CSV | 자치구 집계 |
| OA-2734 | 자치구 연도별 CCTV | CSV | 시계열 |
| OA-21097 | 범죄예방 CCTV | CSV | 자치구 집계 |
| 316 | 5대 범죄 발생현황 | Excel | 자치구 단위 |
| 10943 | 5대 범죄 장소별 | Excel | 장소유형별 |
| OA-20336 | 무인민원발급기 | CSV | 운영시간 필드 포함 |
| OA-2799 | 어린이 보호구역 | CSV | 좌표 |
| OA-16064 | 이용업 인허가 | CSV | 야간 영업 프록시 |
| OA-21275 | 서울시 부동산 실거래가 | CSV | 2트랙 기능용 |

#### 파일명 규칙
`seoul_{OA-ID}_{YYYYMMDD}.csv` — 예: `seoul_OA-21695_20260410.csv`

원본은 `data/raw/` 폴더에 보관, 전처리 버전은 `data/processed/`.

---

### 방법 ② — 서울 열린데이터광장 OpenAPI

생활인구처럼 **큰 데이터**나 **정기 갱신**이 필요한 경우.

#### 절차
1. 데이터셋 상세 페이지 → **"OpenAPI"** 탭
2. 샘플 URL 확인 (서비스명, 포맷, 범위 파라미터)
3. URL 형식:
   ```
   http://openapi.seoul.go.kr:8088/{KEY}/json/{SERVICE}/{START}/{END}/
   ```
4. **요청당 최대 1,000건** → 페이지네이션 루프 필요

#### 이 방법으로 수집할 데이터

| ID | 이름 | 서비스명 (예시) |
|---|---|---|
| **OA-14979** ★ | 서울 생활인구 (집계구 × 시간대) | `SPOP_LOCAL_RESD_JACHI` 등 데이터셋별 상이 |

#### Python 수집 스크립트 예시

```python
import requests, time, pandas as pd
from os import getenv

KEY = getenv("SEOUL_OPENAPI_KEY")
SERVICE = "SPOP_LOCAL_RESD_JACHI"  # OpenAPI 탭에서 정확한 이름 확인
rows = []

for start in range(1, 1_000_001, 1000):
    end = start + 999
    url = f"http://openapi.seoul.go.kr:8088/{KEY}/json/{SERVICE}/{start}/{end}/"
    r = requests.get(url).json()
    data = r.get(SERVICE, {}).get("row", [])
    if not data:
        break
    rows.extend(data)
    time.sleep(0.2)  # rate limit 대응

df = pd.DataFrame(rows)
df.to_csv("data/raw/seoul_living_pop_20260410.csv", index=False, encoding="utf-8")
```

#### 주의
- 생활인구는 **날짜별 파일 누적 제공**되는 경우가 많음 → **최근 1년치** 또는 **월별 집계 후 저장**
- 인증키 노출 방지: 코드에 하드코딩 금지, `.env`에서 로드

---

### 방법 ③ — LOCALDATA 대량 다운로드

인허가 기반 POI (유흥업소·편의점 등).

#### 절차
1. `localdata.go.kr` 로그인
2. 상단 **"지역별"** 또는 **"전국"** 데이터
3. 업종 선택 → **서울특별시** 필터
4. **"다운로드 요청"** (대용량이면 이메일로 링크 전송)
5. CSV/Excel 받음 → **좌표 X·Y 컬럼, 좌표계 EPSG:2097** (중부원점 TM)

#### 이 방법으로 수집할 데이터

| 카테고리 | 업종 선택 |
|---|---|
| 유흥주점 | 유흥주점영업 |
| 단란주점 | 단란주점영업 |
| 노래연습장 | 노래연습장업 |
| 편의점 | 담배소매업 + 휴게음식점 (브랜드 필터링) |

#### 좌표 변환 (필수)

LOCALDATA 좌표는 EPSG:2097 → WGS84(EPSG:4326)로 변환 필요.

```python
import pandas as pd
from pyproj import Transformer

df = pd.read_csv("data/raw/localdata_유흥주점.csv", encoding="cp949")
df = df[df["좌표정보X(EPSG2097)"].notna()]

transformer = Transformer.from_crs("EPSG:2097", "EPSG:4326", always_xy=True)
df["lng"], df["lat"] = transformer.transform(
    df["좌표정보X(EPSG2097)"].values,
    df["좌표정보Y(EPSG2097)"].values,
)
df.to_csv("data/processed/유흥주점_wgs84.csv", index=False, encoding="utf-8")
```

#### 편의점 24시간 판별 (브랜드 휴리스틱)

LOCALDATA에는 영업시간 필드가 없음. 브랜드명으로 근사.

```python
CONV_BRANDS = r"CU|GS25|세븐일레븐|7-ELEVEN|7-Eleven|이마트24|미니스톱"
df_conv = df[df["사업장명"].str.contains(CONV_BRANDS, na=False, regex=True)]
```

**검증**: 샘플 50개 실제 영업시간 수동 확인 → 정확도 측정 권장.

---

### 방법 ④ — 공공데이터포털 OpenAPI

#### 절차
1. `data.go.kr`에서 데이터셋 검색 (ID로 검색 권장)
2. **"활용신청"** 클릭 → 활용목적 간단히 작성 ("대회 출품작 개발") → 제출
3. 자동승인 API는 **즉시**, 수동은 1~2일
4. 마이페이지 → 활용 API 목록에서 **일반 인증키** 확인
5. API 명세서(PDF) 다운로드 → 샘플 호출

#### 이 방법으로 수집할 데이터

| ID | 이름 | 엔드포인트 힌트 |
|---|---|---|
| **15000563** | 응급의료기관 (국립중앙의료원) | `ErmctInfoInqireService/getEgytListInfoInqire` |
| 15000652 | 자동심장충격기(AED) 위치 | 전국 단위, 서울 필터링 |
| 15034534 | 전국 안심택배함 표준데이터 | 표준 CSV도 제공 |
| 국토부 전월세 | 아파트·오피스텔·단독다가구 각각 별도 | `RTMSDataSvc*Rent` |

#### Python 예시 — 응급의료기관

```python
import requests, xmltodict, pandas as pd
from os import getenv

KEY = getenv("DATA_GO_KR_KEY")
url = "http://apis.data.go.kr/B552657/ErmctInfoInqireService/getEgytListInfoInqire"
params = {
    "serviceKey": KEY,
    "STAGE1": "서울특별시",
    "pageNo": 1,
    "numOfRows": 1000,
}
r = requests.get(url, params=params)
data = xmltodict.parse(r.text)
items = data["response"]["body"]["items"]["item"]
df = pd.DataFrame(items if isinstance(items, list) else [items])
df.to_csv("data/raw/emergency_medical.csv", index=False, encoding="utf-8")
```

#### 국토부 실거래가 (원룸 대부분은 단독·다가구)

```python
# 단독·다가구 전월세
url = "http://apis.data.go.kr/1613000/RTMSDataSvcSHRent/getRTMSDataSvcSHRent"
params = {
    "serviceKey": KEY,
    "LAWD_CD": "11680",   # 강남구 법정동 앞 5자리 (11680 = 강남구)
    "DEAL_YMD": "202603",  # 2026년 3월
    "numOfRows": 1000,
}
# 서울 25개 자치구 × 최근 12개월 루프 필요
```

**법정동 코드**: 공공데이터포털에서 "법정동 코드 전체자료" 검색 → CSV 다운로드. 서울은 `11`로 시작하는 25개 구.

---

### 방법 ⑤ — 공공데이터포털 파일 다운로드 + 지오코딩

좌표가 없고 주소만 있는 데이터는 다운로드 후 카카오맵으로 지오코딩.

#### 이 방법으로 수집할 데이터

| ID | 이름 | 후처리 |
|---|---|---|
| 15077036 | 경찰청 지구대·파출소 | 주소 → 카카오맵 지오코딩 |

#### 카카오맵 지오코딩 스크립트

```python
import requests, time, pandas as pd
from os import getenv

KAKAO_KEY = getenv("KAKAO_REST_KEY")
headers = {"Authorization": f"KakaoAK {KAKAO_KEY}"}

def geocode(addr):
    url = "https://dapi.kakao.com/v2/local/search/address.json"
    r = requests.get(url, params={"query": addr}, headers=headers).json()
    docs = r.get("documents", [])
    if docs:
        return float(docs[0]["y"]), float(docs[0]["x"])  # lat, lng
    return None, None

df = pd.read_csv("data/raw/police_stations.csv", encoding="cp949")
df["lat"], df["lng"] = None, None
for i, row in df.iterrows():
    lat, lng = geocode(row["주소"])
    df.at[i, "lat"] = lat
    df.at[i, "lng"] = lng
    time.sleep(0.05)  # 초당 30회 제한 대응

df.to_csv("data/processed/police_stations_geocoded.csv", index=False, encoding="utf-8")
```

서울 관내 지구대·파출소는 **수백 건 수준** → 몇 분이면 완료.

---

### 방법 ⑥ — OSMnx (Python)

보행자 도로망은 Python 라이브러리로 직접 쿼리.

#### 설치
```bash
pip install osmnx
```

#### 수집 스크립트
```python
import osmnx as ox

G = ox.graph_from_place(
    "Seoul, South Korea",
    network_type="walk",  # 보행자 전용
    simplify=True,
)

ox.save_graphml(G, "data/raw/seoul_walk.graphml")
print(f"Nodes: {len(G.nodes)}, Edges: {len(G.edges)}")
```

#### 예상
- 다운로드 시간: **5~15분**
- 파일 크기: ~수십 MB
- 노드 수십만 개

#### 도로폭·보도 속성 coverage 확인
```python
has_width = sum(1 for _, _, d in G.edges(data=True) if "width" in d)
has_sidewalk = sum(1 for _, _, d in G.edges(data=True) if "sidewalk" in d)
total = G.number_of_edges()
print(f"width: {has_width}/{total}, sidewalk: {has_sidewalk}/{total}")
```

서울은 `width` 속성 coverage가 낮을 가능성 → **일단 받아본 뒤** feature 포함 여부 재결정.

---

### 방법 ⑦ — KASI 천문연 API (일출·일몰)

#### 절차
1. `astro.kasi.re.kr` 로그인 → **Open API** 신청 → 즉시 승인
2. 실제로는 공공데이터포털을 경유한 KASI API 사용 (`apis.data.go.kr/B090041`)
3. "출몰 시각 정보" 엔드포인트

#### Python 예시
```python
import requests, xmltodict

KEY = getenv("KASI_KEY")  # 또는 DATA_GO_KR_KEY 공용
url = "http://apis.data.go.kr/B090041/openapi/service/RiseSetInfoService/getAreaRiseSetInfo"
params = {
    "serviceKey": KEY,
    "locdate": "20260410",
    "location": "서울",
}
r = requests.get(url, params=params)
data = xmltodict.parse(r.text)
item = data["response"]["body"]["items"]["item"]
# sunrise, sunset 필드 추출
```

#### 팁
1년치(365일) 서울 일출·일몰을 **한 번에 받아서 로컬 CSV로 저장** → 매번 API 호출 불필요.

```python
import datetime as dt

records = []
d = dt.date(2026, 1, 1)
while d <= dt.date(2026, 12, 31):
    params["locdate"] = d.strftime("%Y%m%d")
    r = requests.get(url, params=params)
    item = xmltodict.parse(r.text)["response"]["body"]["items"]["item"]
    records.append({"date": d, "sunrise": item["sunrise"], "sunset": item["sunset"]})
    d += dt.timedelta(days=1)
    time.sleep(0.1)

pd.DataFrame(records).to_csv("data/processed/sun_times_2026.csv", index=False)
```

---

### 방법 ⑧ — GitHub 공개 저장소 (행정경계)

열린데이터광장 행정동 경계도 있지만, GitHub 저장소가 품질이 좋고 바로 쓸 수 있는 GeoJSON 제공.

#### 수집
```bash
git clone https://github.com/vuski/admdongkor.git
```

또는 raw GeoJSON을 직접 다운로드. 서울 행정동만 필터링해서 PostGIS에 적재.

```python
import geopandas as gpd

gdf = gpd.read_file("admdongkor/ver20230701/HangJeongDong_ver20230701.geojson")
seoul = gdf[gdf["sidonm"] == "서울특별시"]
seoul.to_file("data/processed/seoul_dong.geojson", driver="GeoJSON")
```

---

## 3. 수집 순서 — 의존성 기반

### 1단계: 가장 쉬운 것부터 (하루)

```
[Step 0]  모든 계정·키 8개 발급 (1~2시간)
   ↓
[방법 ①]  열린데이터광장 11개 파일 브라우저 다운로드
[방법 ⑥]  OSMnx로 서울 보행 도로망 다운로드
[방법 ⑧]  GitHub 행정경계 다운로드
```

### 2단계: API 활용 신청 + 대기 병행 (1~2일)

```
[방법 ③]  LOCALDATA 유흥업소·편의점 다운로드 요청 (이메일 대기)
[방법 ④]  공공데이터포털 API 활용신청 제출
[방법 ⑦]  KASI API 1년치 일출·일몰 미리 수집
[방법 ②]  열린데이터광장 OA-14979 생활인구 페이지네이션 수집
```

### 3단계: 후처리

```
- LOCALDATA 좌표 EPSG:2097 → 4326 변환
- [방법 ⑤] 경찰서·파출소 카카오맵 지오코딩
- 편의점 브랜드 필터링 (24시 휴리스틱)
- 전부 PostGIS에 적재 + 공간 인덱스 생성
```

### 4단계: 선택 (승인 대기)

```
- 서울 빅데이터캠퍼스 방문 + 동 단위 범죄 데이터 확보 시도
```

---

## 4. 수집 중 반드시 지킬 규칙

1. **좌표계 통일** — 모든 좌표는 EPSG:4326(WGS84). LOCALDATA만 EPSG:2097이므로 반드시 변환.
2. **한글 인코딩** — 공공데이터는 대부분 **CP949(EUC-KR)**. `pd.read_csv(path, encoding="cp949")`
3. **파일명 규칙** — `{source}_{dataset_id}_{YYYYMMDD}.csv`
4. **원본 보존** — `data/raw/`는 절대 수정 금지, 전처리 버전은 `data/processed/`
5. **`.env` 키 관리** — `.gitignore`에 `.env` 추가
6. **API 호출 rate limit** — 0.05~0.2초 sleep, 실패 시 재시도 로직
7. **다운로드 로그** — `data/metadata.md`에 각 파일의 다운로드 날짜·버전·소스 URL 기록

---

## 5. 폴더 구조 제안

```
seoul_data/
├── data/
│   ├── raw/               # 원본 (수정 금지)
│   │   ├── seoul_OA-21695_20260410.zip
│   │   ├── seoul_OA-22205_20260410.csv
│   │   ├── localdata_유흥주점_20260410.csv
│   │   └── ...
│   ├── processed/         # 전처리 결과
│   │   ├── 유흥주점_wgs84.csv
│   │   ├── police_stations_geocoded.csv
│   │   ├── sun_times_2026.csv
│   │   └── seoul_dong.geojson
│   ├── metadata.md        # 다운로드 로그
│   └── README.md
├── scripts/
│   ├── collect/           # 수집 스크립트
│   │   ├── seoul_opendata.py
│   │   ├── localdata.py
│   │   ├── data_go_kr.py
│   │   ├── osm_walk.py
│   │   ├── kasi_sun.py
│   │   └── geocode_police.py
│   └── postgis/           # DB 적재 스크립트
│       ├── schema.sql
│       └── load_all.py
├── .env                   # 키 (gitignore)
└── .gitignore
```

---

## 6. 예상 총 소요 시간

| 단계 | 소요 시간 |
|---|---|
| Step 0 계정·키 발급 | 1~2시간 |
| 1단계 파일 다운로드 + OSMnx | 반나절 |
| 2단계 API 활용신청·수집 | ~1일 (병행) |
| 3단계 후처리·지오코딩·PostGIS 적재 | 반나절 |
| 4단계 빅데이터캠퍼스 (선택) | ~1주 |

**집중 작업 시 이틀 이내 수집 완료 가능.**

---

## 7. 수집 후 검증 체크리스트

데이터 수집이 끝났다고 판단하기 전에 아래를 확인:

- [ ] 각 데이터셋의 row 수가 예상 범위 내인가? (예: 안심귀갓길 362개, 행정동 ~425개)
- [ ] 좌표 컬럼이 모두 EPSG:4326(위도·경도)로 통일됐는가?
- [ ] 좌표값이 서울 범위 내인가? (위도 37.4~37.7, 경도 126.8~127.2)
- [ ] 한글 인코딩 깨짐 없는가?
- [ ] 가격 데이터(실거래가)가 단독·다가구 카테고리를 포함하는가? (원룸 커버리지)
- [ ] 편의점 브랜드 필터 샘플 50개 실제 영업시간 확인
- [ ] PostGIS 공간 인덱스(GIST)가 모든 geometry 테이블에 걸려 있는가?
- [ ] `.env` 파일이 git에 올라가지 않았는가?

---

## 8. 문제 발생 시 체크 포인트

| 증상 | 점검 |
|---|---|
| 한글이 깨짐 | `encoding="cp949"` 또는 `"euc-kr"` |
| API 401/403 | 인증키 오타, 활용신청 승인 여부 |
| API 빈 응답 | 파라미터 범위·서비스명 확인, 제한 건수 |
| 좌표가 이상한 값 | EPSG 변환 누락 (LOCALDATA는 2097) |
| OSMnx 타임아웃 | `simplify=False`로 먼저 받고 후처리 |
| 카카오 지오코딩 실패 | 주소 정제 (괄호·특수문자 제거) 후 재시도 |
| 빅데이터캠퍼스 지연 | 공개분(OA-14979)로 대체 진행 |

---

## 9. 다음 단계

수집이 끝나면:

1. **PostGIS 스키마 설계** → 모든 데이터 적재
2. **서울 100m 격자 생성** → 격자-데이터 공간 조인
3. **Feature 파이프라인 구현** → 28개 feature 계산
4. **모델 ① 학습 시작**

자세한 설계는 `ml-model-design-2026-04-10.md` 참조.
