// DOM 요소들
const dateInput = document.getElementById('dateInput');
const searchBtn = document.getElementById('searchBtn');
const resultSection = document.getElementById('resultSection');
const loading = document.getElementById('loading');
const mealInfo = document.getElementById('mealInfo');
const noData = document.getElementById('noData');
const error = document.getElementById('error');
const mealDate = document.getElementById('mealDate');
const lunchItems = document.getElementById('lunchItems');

// API 설정
const API_BASE_URL = 'https://open.neis.go.kr/hub/mealServiceDietInfo';
const SCHOOL_CODE = '7531100'; // 제공된 학교 코드
const OFFICE_CODE = 'J10'; // 제공된 교육청 코드

// 페이지 로드 시 오늘 날짜로 설정
document.addEventListener('DOMContentLoaded', function() {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    dateInput.value = todayString;
    
    // 초기 로드 시 오늘 날짜 급식정보 조회
    fetchMealInfo(todayString);
});

// 조회 버튼 클릭 이벤트
searchBtn.addEventListener('click', function() {
    const selectedDate = dateInput.value;
    if (selectedDate) {
        fetchMealInfo(selectedDate);
    } else {
        showError('날짜를 선택해주세요.');
    }
});

// Enter 키 이벤트
dateInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

// 급식정보 조회 함수
async function fetchMealInfo(date) {
    showLoading();
    
    try {
        // 날짜 형식을 YYYYMMDD로 변환
        const formattedDate = date.replace(/-/g, '');
        
        const url = `${API_BASE_URL}?ATPT_OFCDC_SC_CODE=${OFFICE_CODE}&SD_SCHUL_CODE=${SCHOOL_CODE}&MLSV_YMD=${formattedDate}`;
        
        console.log('API URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // XML 응답을 텍스트로 받기
        const xmlText = await response.text();
        console.log('XML Response:', xmlText);
        
        // XML을 파싱하여 데이터 처리
        const data = parseXMLResponse(xmlText);
        processMealData(data, date);
        
    } catch (error) {
        console.error('Error fetching meal data:', error);
        showError('급식정보를 불러오는 중 오류가 발생했습니다.');
    }
}

// 급식 데이터 처리 함수
function processMealData(data, date) {
    hideAllSections();
    
    // API 응답에서 급식정보 추출
    if (data.RESULT && data.RESULT.CODE === 'INFO-200') {
        // 급식정보가 없는 경우
        showNoData();
        return;
    }
    
    if (data.mealServiceDietInfo && data.mealServiceDietInfo.row) {
        const mealData = data.mealServiceDietInfo.row;
        
        if (mealData.length > 0) {
            displayMealInfo(mealData, date);
        } else {
            showNoData();
        }
    } else {
        showNoData();
    }
}

// 급식정보 표시 함수
function displayMealInfo(mealData, date) {
    hideAllSections();
    
    // 날짜 표시
    const displayDate = formatDate(date);
    mealDate.textContent = `${displayDate} 급식정보`;
    
    // 중식 정보 찾기
    const lunchData = mealData.find(meal => meal.MMEAL_SC_CODE === '2');
    
    if (lunchData && lunchData.DDISH_NM) {
        // 급식 메뉴 파싱 및 표시
        const menuItems = parseMenuItems(lunchData.DDISH_NM);
        displayMenuItems(lunchItems, menuItems);
    } else {
        lunchItems.innerHTML = '<p>중식 정보가 없습니다.</p>';
    }
    
    mealInfo.style.display = 'block';
}

// 메뉴 아이템 파싱 함수
function parseMenuItems(menuString) {
    if (!menuString) return [];
    
    // 메뉴 문자열을 분리 (보통 <br/> 태그나 쉼표로 구분됨)
    let items = menuString.split(/<br\/?>/i);
    
    // 만약 <br/> 태그가 없다면 쉼표로 분리
    if (items.length === 1) {
        items = menuString.split(',');
    }
    
    // 각 아이템 정리 (공백 제거, 특수문자 처리)
    return items
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .map(item => {
            // 알레르기 정보 제거 (보통 숫자로 표시됨)
            return item.replace(/\d+\./g, '').trim();
        });
}

// 메뉴 아이템 표시 함수
function displayMenuItems(container, items) {
    container.innerHTML = '';
    
    if (items.length === 0) {
        container.innerHTML = '<p>메뉴 정보가 없습니다.</p>';
        return;
    }
    
    items.forEach(item => {
        const itemElement = document.createElement('p');
        itemElement.textContent = item;
        container.appendChild(itemElement);
    });
}

// 날짜 포맷 함수
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    
    return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
}

// 로딩 표시 함수
function showLoading() {
    hideAllSections();
    loading.style.display = 'block';
}

// 모든 섹션 숨기기 함수
function hideAllSections() {
    loading.style.display = 'none';
    mealInfo.style.display = 'none';
    noData.style.display = 'none';
    error.style.display = 'none';
}

// 데이터 없음 표시 함수
function showNoData() {
    hideAllSections();
    noData.style.display = 'block';
}

// 에러 표시 함수
function showError(message) {
    hideAllSections();
    error.style.display = 'block';
    error.querySelector('p').textContent = message;
}

// XML 응답 파싱 함수
function parseXMLResponse(xmlText) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        // XML 파싱 오류 확인
        const parseError = xmlDoc.getElementsByTagName("parsererror");
        if (parseError.length > 0) {
            throw new Error("XML 파싱 오류");
        }
        
        const result = {};
        
        // RESULT 정보 파싱
        const resultElement = xmlDoc.getElementsByTagName("RESULT")[0];
        if (resultElement) {
            result.RESULT = {
                CODE: getElementText(resultElement, "CODE"),
                MESSAGE: getElementText(resultElement, "MESSAGE")
            };
        }
        
        // mealServiceDietInfo 파싱
        const mealServiceDietInfo = xmlDoc.getElementsByTagName("mealServiceDietInfo")[0];
        if (mealServiceDietInfo) {
            const rows = mealServiceDietInfo.getElementsByTagName("row");
            const mealData = [];
            
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                mealData.push({
                    MMEAL_SC_CODE: getElementText(row, "MMEAL_SC_CODE"),
                    MMEAL_SC_NM: getElementText(row, "MMEAL_SC_NM"),
                    MLSV_YMD: getElementText(row, "MLSV_YMD"),
                    DDISH_NM: getElementText(row, "DDISH_NM"),
                    CAL_INFO: getElementText(row, "CAL_INFO"),
                    NTR_INFO: getElementText(row, "NTR_INFO")
                });
            }
            
            result.mealServiceDietInfo = {
                row: mealData
            };
        }
        
        console.log('Parsed Data:', result);
        return result;
        
    } catch (error) {
        console.error('XML parsing error:', error);
        throw error;
    }
}

// XML 요소에서 텍스트 추출하는 헬퍼 함수
function getElementText(parent, tagName) {
    const element = parent.getElementsByTagName(tagName)[0];
    return element ? element.textContent : '';
}

// CORS 우회를 위한 프록시 서버 사용 (필요한 경우)
// 실제 운영 환경에서는 서버 사이드에서 API 호출을 처리하는 것이 좋습니다.
async function fetchWithProxy(url) {
    // CORS 문제가 발생할 경우를 대비한 프록시 서버 사용
    const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
    
    try {
        const response = await fetch(proxyUrl);
        return response;
    } catch (error) {
        console.error('Proxy fetch failed:', error);
        // 프록시 실패 시 직접 요청 시도
        return fetch(url);
    }
}
