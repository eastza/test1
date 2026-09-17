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

    initNewsWidget();
});

const NEWS_FEED_API = 'https://api.rss2json.com/v1/api.json?rss_url=';
let currentNewsQuery = '디지털 정부';

function initNewsWidget() {
    const topicButtons = document.querySelectorAll('.news-topic');

    topicButtons.forEach(button => {
        button.addEventListener('click', () => {
            topicButtons.forEach(item => {
                const selected = item === button;
                item.classList.toggle('active', selected);
                item.setAttribute('aria-pressed', selected.toString());
            });

            currentNewsQuery = button.dataset.query;
            loadLatestNews(currentNewsQuery);
        });
    });

    document.getElementById('news-refresh').addEventListener('click', () => {
        loadLatestNews(currentNewsQuery, true);
    });

    loadLatestNews(currentNewsQuery);
}

async function loadLatestNews(query, forceRefresh = false) {
    const status = document.getElementById('news-status');
    const list = document.getElementById('news-list');
    const refreshButton = document.getElementById('news-refresh');
    const moreLink = document.getElementById('news-more');
    const newsSearchUrl = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&setlang=ko-kr`;
    const rssUrl = `${newsSearchUrl}&format=rss`;

    moreLink.href = newsSearchUrl;
    status.textContent = '최신 뉴스를 불러오는 중입니다.';
    status.classList.remove('hidden');
    list.replaceChildren();
    refreshButton.disabled = true;

    try {
        const cacheBuster = forceRefresh ? `&_=${Date.now()}` : '';
        const response = await fetch(`${NEWS_FEED_API}${encodeURIComponent(rssUrl)}${cacheBuster}`);
        if (!response.ok) throw new Error(`뉴스 응답 오류: ${response.status}`);

        const feed = await response.json();
        if (feed.status !== 'ok' || !Array.isArray(feed.items) || feed.items.length === 0) {
            throw new Error('표시할 뉴스가 없습니다.');
        }

        renderNewsItems(feed.items.slice(0, 6));
        status.classList.add('hidden');
    } catch (error) {
        console.error('뉴스 로딩 중 오류 발생:', error);
        status.innerHTML = `뉴스 목록을 불러오지 못했습니다. <a href="${newsSearchUrl}" target="_blank" rel="noopener noreferrer">뉴스 검색에서 바로 보기</a>`;
    } finally {
        refreshButton.disabled = false;
    }
}

function renderNewsItems(items) {
    const list = document.getElementById('news-list');
    const fragment = document.createDocumentFragment();

    items.forEach(item => {
        const article = document.createElement('article');
        const link = document.createElement('a');
        const title = document.createElement('h3');
        const meta = document.createElement('p');
        const source = document.createElement('span');
        const published = document.createElement('span');
        const titleParts = item.title.split(' - ');

        article.className = 'news-item';
        link.href = item.link.replace('http://www.bing.com/', 'https://www.bing.com/');
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        title.className = 'news-item-title';
        title.textContent = titleParts.slice(0, -1).join(' - ') || item.title;
        meta.className = 'news-item-meta';
        source.textContent = item.author || titleParts.at(-1) || '언론사';
        published.textContent = formatNewsDate(item.pubDate);

        meta.append(source, published);
        link.append(title, meta);
        article.appendChild(link);
        fragment.appendChild(article);
    });

    list.replaceChildren(fragment);
}

function formatNewsDate(dateString) {
    const publishedDate = new Date(dateString.replace(' ', 'T') + 'Z');
    if (Number.isNaN(publishedDate.getTime())) return '최근';

    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - publishedDate.getTime()) / 60000));
    if (elapsedMinutes < 60) return `${elapsedMinutes || 1}분 전`;
    if (elapsedMinutes < 1440) return `${Math.floor(elapsedMinutes / 60)}시간 전`;
    if (elapsedMinutes < 10080) return `${Math.floor(elapsedMinutes / 1440)}일 전`;

    return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(publishedDate);
}

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
