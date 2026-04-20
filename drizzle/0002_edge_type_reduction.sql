-- edge_type enum을 학습 관점 3종(prerequisite / contains / relatedTo)으로 축소.
-- 기존 값 매핑:
--   introduces, uses, extends, appliedIn, raises → prerequisite
--   contains → contains (유지)
--   similarity, shared_concept, citation, manual → relatedTo
--   relatedTo → relatedTo
-- Postgres는 ENUM VALUE 제거를 직접 지원 안 하므로 새 타입을 만들어 swap한다.

-- 1) 기본값 제거 (기존 enum에 묶여 있으므로)
ALTER TABLE "edges" ALTER COLUMN "type" DROP DEFAULT;
--> statement-breakpoint

-- 2) 새 enum 생성
CREATE TYPE "public"."edge_type_new" AS ENUM('prerequisite', 'contains', 'relatedTo');
--> statement-breakpoint

-- 3) 컬럼 타입 변환 + 값 매핑
ALTER TABLE "edges" ALTER COLUMN "type" TYPE "public"."edge_type_new" USING (
  CASE "type"::text
    WHEN 'introduces' THEN 'prerequisite'
    WHEN 'uses' THEN 'prerequisite'
    WHEN 'extends' THEN 'prerequisite'
    WHEN 'appliedIn' THEN 'prerequisite'
    WHEN 'raises' THEN 'prerequisite'
    WHEN 'contains' THEN 'contains'
    WHEN 'similarity' THEN 'relatedTo'
    WHEN 'shared_concept' THEN 'relatedTo'
    WHEN 'citation' THEN 'relatedTo'
    WHEN 'manual' THEN 'relatedTo'
    WHEN 'relatedTo' THEN 'relatedTo'
    ELSE 'relatedTo'
  END::"public"."edge_type_new"
);
--> statement-breakpoint

-- 4) 옛 enum 제거, 새 enum 리네임
DROP TYPE "public"."edge_type";
--> statement-breakpoint
ALTER TYPE "public"."edge_type_new" RENAME TO "edge_type";
--> statement-breakpoint

-- 5) 기본값 재설정
ALTER TABLE "edges" ALTER COLUMN "type" SET DEFAULT 'relatedTo';
