# AI Blog Platform

## 프로젝트 개요
AI 뉴스, 논문(arXiv), 기사를 스크래핑하여 자동으로 고품질 블로그 글로 변환하는 플랫폼.
Medium 대신 자체 블로그를 운영하며, 콘텐츠 생성부터 발행까지 관리.

## 기술 스택

| 영역 | 기술 | 버전/비고 |
|------|------|-----------|
| Backend | FastAPI | Python 3.11+ |
| Database | Supabase | PostgreSQL, 기존 계정 사용 |
| LLM | Gemini 2.5 Flash | 메인 (65K output, 저렴) |
| LLM (백업) | Gemini 2.5 Pro | 고품질 필요 시 |
| Task Queue | APScheduler | 정기 스크래핑 (Replit 호환) |
| Frontend | Next.js 14 | 추후 개발 |
| Deployment | Replit | Always On 사용 |

## 배포 환경: Replit

### Replit 설정
- **언어**: Python (FastAPI)
- **Always On**: 활성화 (24시간 운영)
- **Secrets**: 환경 변수 저장
- **Domain**: `https://ai-blog-platform.{username}.repl.co`

### Replit 파일 구조
```
ai-blog-platform/           # Replit 프로젝트 루트
├── .replit                 # Replit 실행 설정
├── replit.nix              # Nix 패키지 설정
├── pyproject.toml          # Python 의존성
├── main.py                 # 진입점 (FastAPI 앱 import)
├── backend/                # 백엔드 코드
│   └── ...
└── CLAUDE.md
```

### .replit 파일
```toml
run = "uvicorn main:app --host 0.0.0.0 --port 8080"
modules = ["python-3.11"]

[nix]
channel = "stable-24_05"

[deployment]
run = ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port 8080"]
deploymentTarget = "cloudrun"

[[ports]]
localPort = 8080
externalPort = 80
```

### replit.nix 파일
```nix
{ pkgs }: {
  deps = [
    pkgs.python311
    pkgs.python311Packages.pip
  ];
}
```

### main.py (Replit 진입점)
```python
from backend.app.main import app

# Replit이 이 파일을 실행
# uvicorn main:app --host 0.0.0.0 --port 8080
```

### Replit Secrets 설정
Replit 대시보드 → Secrets 탭에서 추가:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
GEMINI_API_KEY=your-gemini-api-key
APP_ENV=production
```

### Replit 주의사항
1. **Always On 필요**: 무료 플랜은 비활성 시 슬립 모드
2. **Secrets 사용**: .env 파일 대신 Replit Secrets 사용
3. **포트 8080**: Replit 기본 포트
4. **APScheduler 사용**: Celery 대신 (Redis 불필요)
5. **파일 저장 제한**: 대용량 파일은 Supabase Storage 활용

## 폴더 구조 (Replit 기준)

```
ai-blog-platform/               # Replit 프로젝트 루트
├── .replit                     # Replit 실행 설정
├── replit.nix                  # Nix 패키지 설정
├── pyproject.toml              # Python 의존성 (pip 대신)
├── main.py                     # Replit 진입점
├── CLAUDE.md                   # 이 파일
├── README.md
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI 앱 정의
│   │   ├── config.py            # 설정 (Replit Secrets 로드)
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── deps.py          # 의존성 (DB 세션 등)
│   │   │   └── routes/
│   │   │       ├── __init__.py
│   │   │       ├── sources.py   # 소스 CRUD
│   │   │       ├── articles.py  # 글 CRUD
│   │   │       └── generate.py  # 글 생성 트리거
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── source.py        # Source 모델
│   │   │   └── article.py       # Article 모델
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── source.py        # Source Pydantic 스키마
│   │   │   └── article.py       # Article Pydantic 스키마
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── scrapers/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py      # 베이스 스크래퍼
│   │   │   │   ├── arxiv.py     # arXiv 논문
│   │   │   │   ├── news.py      # 뉴스 RSS
│   │   │   │   └── article.py   # 일반 기사
│   │   │   │
│   │   │   ├── generators/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── blog_writer.py    # LLM 글 생성
│   │   │   │   ├── prompts.py        # 프롬프트 템플릿
│   │   │   │   └── reference_validator.py  # 링크 검증
│   │   │   │
│   │   │   └── llm/
│   │   │       ├── __init__.py
│   │   │       ├── base.py      # LLM 베이스 클래스
│   │   │       └── gemini.py    # Gemini API 클라이언트
│   │   │
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── database.py      # Supabase 연결
│   │   │   └── repositories/    # 데이터 접근 레이어
│   │   │       ├── __init__.py
│   │   │       ├── source_repo.py
│   │   │       └── article_repo.py
│   │   │
│   │   └── scheduler/
│   │       ├── __init__.py
│   │       └── jobs.py          # APScheduler 작업 정의
│   │
│   └── tests/
│
└── database/
    └── schema.sql               # Supabase 테이블 생성 SQL
```

## Database 스키마

### sources 테이블
수집한 원본 소스 (뉴스, 논문, 기사)

```sql
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('news', 'paper', 'article')),
    title VARCHAR(500) NOT NULL,
    url VARCHAR(1000) UNIQUE NOT NULL,
    content TEXT,                      -- 원본 콘텐츠
    summary TEXT,                      -- 요약 (선택)
    metadata JSONB DEFAULT '{}',       -- 저자, 날짜, 카테고리 등
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'skipped', 'failed')),
    error_message TEXT,                -- 실패 시 에러 메시지
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_sources_status ON sources(status);
CREATE INDEX idx_sources_type ON sources(type);
CREATE INDEX idx_sources_scraped_at ON sources(scraped_at DESC);
```

### articles 테이블
생성된 블로그 글

```sql
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    
    -- 콘텐츠
    title VARCHAR(300) NOT NULL,
    subtitle VARCHAR(200),
    slug VARCHAR(300) UNIQUE NOT NULL,
    content TEXT NOT NULL,             -- Markdown 형식
    
    -- 메타데이터
    tags TEXT[] DEFAULT '{}',          -- ['AI', 'MachineLearning']
    references JSONB DEFAULT '[]',     -- [{title, url, verified}]
    word_count INTEGER,
    char_count INTEGER,
    
    -- 상태 관리
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
    
    -- SEO
    meta_description VARCHAR(160),
    og_image_url VARCHAR(500),
    
    -- 타임스탬프
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- LLM 메타
    llm_model VARCHAR(50),             -- 사용된 모델
    generation_time_seconds FLOAT      -- 생성 소요 시간
);

-- 인덱스
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX idx_articles_tags ON articles USING GIN(tags);
```

### article_versions 테이블
글 버전 히스토리

```sql
CREATE TABLE article_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    change_note VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_article_versions_article_id ON article_versions(article_id);
```

### reference_checks 테이블
Reference 링크 검증 로그

```sql
CREATE TABLE reference_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    url VARCHAR(1000) NOT NULL,
    is_valid BOOLEAN,
    status_code INTEGER,
    error_message TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reference_checks_article_id ON reference_checks(article_id);
```

> **향후 확장**: 다국어 지원 필요 시 `article_translations` 테이블 추가 예정

## API 엔드포인트

### Sources API
```
GET    /api/sources              # 소스 목록 (필터: type, status)
GET    /api/sources/{id}         # 소스 상세
POST   /api/sources              # 소스 수동 추가
POST   /api/sources/scrape       # URL로 스크래핑
DELETE /api/sources/{id}         # 소스 삭제
PATCH  /api/sources/{id}/status  # 상태 변경
```

### Articles API
```
GET    /api/articles             # 글 목록 (필터: status, tags)
GET    /api/articles/{id}        # 글 상세
GET    /api/articles/slug/{slug} # slug로 조회
POST   /api/articles             # 글 수동 생성
PUT    /api/articles/{id}        # 글 수정
DELETE /api/articles/{id}        # 글 삭제
PATCH  /api/articles/{id}/status # 상태 변경 (publish 등)
```

### Generation API
```
POST   /api/generate             # 소스 ID로 글 생성
POST   /api/generate/preview     # 미리보기 (저장 안 함)
POST   /api/generate/validate-refs  # Reference 링크 검증
```

## 글 생성 요구사항

### 소스 타입별 글 길이
| 타입 | 글 길이 | 비고 |
|------|---------|------|
| 루틴 (뉴스) | 15,000~20,000자 | 가장 상세 |
| 논문 (arXiv) | 12,000~15,000자 | 기술적 분석 |
| 기사 | ~10,000자 | 간결한 분석 |

### 글 구조 (공통)
1. **제목**: 원본 rephrasing, 흥미롭고 눈길 끄는 형태
2. **Subtitle**: 140자 이내
3. **서론**: 주제 배경, "왜 알아야 하는가" 설명
4. **본론**: 
   - 사례, 데이터, 장단점 포함
   - 문단 짧게, 소제목으로 구분
   - 원본 기사/논문 내용 분석 반영
5. **결론**: 요약 및 미래 전망
6. **References**: 검증된 링크 2~3개 (하이퍼링크)
7. **태그**: 4~5개 (#AI #MachineLearning 형식)

### 글 작성 규칙
- 언어: 영어
- 톤: 전문 블로거 스타일
- Reference 링크는 반드시 검증 (404 등 제거)
- 거짓 정보, 가짜 링크 절대 금지
- 원본 키워드를 서론/본론에 자연스럽게 배치

## 환경 변수 (Replit Secrets)

Replit 대시보드 → Tools → Secrets에서 설정:

| Key | Value | 설명 |
|-----|-------|------|
| SUPABASE_URL | https://xxxxx.supabase.co | Supabase 프로젝트 URL |
| SUPABASE_KEY | your-anon-key | 공개 anon 키 |
| SUPABASE_SERVICE_KEY | your-service-key | 서버용 서비스 키 |
| GEMINI_API_KEY | your-gemini-api-key | Google AI Studio에서 발급 |
| APP_ENV | production | 환경 구분 |

### config.py에서 로드 방법
```python
import os

class Settings:
    SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.environ.get("SUPABASE_KEY", "")
    SUPABASE_SERVICE_KEY: str = os.environ.get("SUPABASE_SERVICE_KEY", "")
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
    APP_ENV: str = os.environ.get("APP_ENV", "development")

settings = Settings()
```

## 개발 단계

### Phase 1: 기반 구축 (현재)
- [x] 프로젝트 구조 설계
- [ ] FastAPI 프로젝트 초기화
- [ ] Supabase 테이블 생성
- [ ] DB 연결 및 기본 CRUD
- [ ] Sources API 구현
- [ ] Articles API 구현

### Phase 2: 스크래핑
- [ ] arXiv 스크래퍼
- [ ] 뉴스 RSS 스크래퍼  
- [ ] 일반 기사 스크래퍼
- [ ] Reference 링크 검증

### Phase 3: 글 생성
- [ ] Gemini API 연동
- [ ] 프롬프트 템플릿 구현
- [ ] 글 생성 파이프라인
- [ ] 품질 검증 로직

### Phase 4: 프론트엔드
- [ ] Next.js 블로그
- [ ] 어드민 대시보드
- [ ] SEO 최적화

## 명령어 참고

### Replit에서 실행
1. Replit 대시보드에서 "Run" 버튼 클릭
2. 또는 Shell에서:
```bash
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

### 로컬 개발 시
```bash
# 프로젝트 클론 후
cd ai-blog-platform

# 가상환경 (선택)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt
# 또는 pyproject.toml 사용 시
pip install -e .

# 실행
uvicorn main:app --reload
```

### Supabase 테이블 생성
Supabase 대시보드 → SQL Editor에서 `database/schema.sql` 내용 실행

### 테스트
```bash
pytest backend/tests/
```

### API 문서
실행 후 접속:
- Swagger UI: `http://localhost:8080/docs`
- ReDoc: `http://localhost:8080/redoc`
- Replit 배포 시: `https://ai-blog-platform.{username}.repl.co/docs`

## 주의사항
- **Replit Secrets 사용**: .env 파일 대신 Replit Secrets에 API 키 저장
- **Always On 필수**: 스케줄러가 동작하려면 Always On 활성화 필요 (Replit Core 이상)
- **포트 8080**: Replit은 8080 포트 사용
- Supabase Row Level Security (RLS) 설정 필요 시 별도 처리
- Reference 검증 실패 시 해당 링크 제거 후 저장
- APScheduler 사용 (Celery/Redis 대신, Replit 호환성)
- 대용량 파일은 Supabase Storage 활용
