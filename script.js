let allData = [];

document.addEventListener('DOMContentLoaded', () => {
    // data.json 파일을 불러옵니다
    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error('네트워크 응답이 정상이 아닙니다.');
            return response.json();
        })
        .then(data => {
            allData = data;
            
            // 초기 렌더링
            renderSummary(allData);
            renderCards(allData);
        })
        .catch(error => {
            console.error('데이터 로딩 중 오류 발생:', error);
            document.getElementById('cards-container').innerHTML = 
                '<p style="color:red; text-align:center; padding: 20px;">데이터를 불러오는 데 실패했습니다. data.json 파일이 같은 폴더에 있는지 확인해주세요.</p>';
        });

    // 검색어 입력(텍스트) 및 분야(드롭다운) 변경 이벤트 리스너 추가
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('category-filter').addEventListener('change', applyFilters);
});

// 집계표 렌더링 함수
function renderSummary(data) {
    const summary = {};
    
    // 분야별 집계
    data.forEach(item => {
        const category = item.분야;
        if (!summary[category]) {
            summary[category] = { count: 0, budget: 0 };
        }
        summary[category].count += 1;
        summary[category].budget += item.예산_백만원;
    });

    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>분야</th>
                    <th>사업 건수</th>
                    <th>총 예산 (단위: 백만원)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    let totalCount = 0;
    let totalBudget = 0;

    for (const [category, stats] of Object.entries(summary)) {
        tableHTML += `
            <tr>
                <td><strong>${category}</strong></td>
                <td>${stats.count}건</td>
                <td>${stats.budget.toLocaleString()}</td>
            </tr>
        `;
        totalCount += stats.count;
        totalBudget += stats.budget;
    }

    // 합계 행 추가
    tableHTML += `
            <tr class="total-row">
                <td>합계</td>
                <td>${totalCount}건</td>
                <td>${totalBudget.toLocaleString()}</td>
            </tr>
            </tbody>
        </table>
    `;

    document.getElementById('summary-container').innerHTML = tableHTML;
}

// 사업 카드 렌더링 함수
function renderCards(data) {
    const container = document.getElementById('cards-container');
    const noResult = document.getElementById('no-result');
    const resultCount = document.getElementById('result-count');
    
    container.innerHTML = '';
    
    // 요구사항: 결과 N건 표시 (검색 및 필터링 시 즉각 업데이트)
    resultCount.textContent = `검색 결과: ${data.length}건`;

    if (data.length === 0) {
        container.classList.add('hidden');
        noResult.classList.remove('hidden');
        return;
    }

    container.classList.remove('hidden');
    noResult.classList.add('hidden');
    
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-category" data-type="${item.분야}">${item.분야}</div>
            <h3 class="card-title">${item.사업명}</h3>
            <div class="card-budget">
                <span class="budget-label">예산</span>
                <span><strong>${item.예산_백만원.toLocaleString()}</strong> 백만원</span>
            </div>
        `;
        container.appendChild(card);
    });
}

// 분야 및 검색어 다중 필터링 적용 함수
function applyFilters() {
    const keyword = document.getElementById('search-input').value.toLowerCase().trim();
    const selectedCategory = document.getElementById('category-filter').value;
    
    // 조건 1. 분야 필터 매칭 & 조건 2. 검색어 매칭 (사업명 또는 분야)
    const filteredData = allData.filter(item => {
        // 분야 드롭다운이 '전체'("")이거나, 아이템의 분야와 일치해야 함
        const matchCategory = (selectedCategory === "") || (item.분야 === selectedCategory);
        
        // 검색어 텍스트가 비어있거나, 사업명 또는 분야에 키워드가 포함되어야 함
        const matchKeyword = (keyword === "") || 
                             item.사업명.toLowerCase().includes(keyword) || 
                             item.분야.toLowerCase().includes(keyword);
        
        return matchCategory && matchKeyword;
    });
    
    // 필터링된 데이터로 카드 리렌더링
    renderCards(filteredData);
}