"use client"

import { useCallback, useRef, useState } from "react"

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; progress: number; fileName: string }
  | { kind: "error"; message: string }

export interface UploadedDocument {
  id: string
  title: string
  status: string
}

export default function UploadDropzone({
  onUploaded,
  compact = false,
}: {
  onUploaded?: (doc: UploadedDocument) => void
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [state, setState] = useState<UploadState>({ kind: "idle" })

  const upload = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setState({ kind: "error", message: "PDF 파일만 가능합니다" })
        return
      }
      setState({ kind: "uploading", progress: 0, fileName: file.name })
      try {
        // fetch는 업로드 progress 이벤트가 없어서 XMLHttpRequest로 폴백
        const doc = await uploadWithProgress(file, (p) =>
          setState({ kind: "uploading", progress: p, fileName: file.name })
        )
        setState({ kind: "idle" })
        onUploaded?.(doc)
      } catch (e) {
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : String(e),
        })
      }
    },
    [onUploaded]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDrag(false)
      const file = e.dataTransfer.files?.[0]
      if (file) upload(file)
    },
    [upload]
  )

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) upload(file)
      e.target.value = ""
    },
    [upload]
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={[
        "cursor-pointer rounded-lg border-2 border-dashed transition-colors",
        compact ? "p-4" : "p-8",
        drag
          ? "border-neutral-900 bg-neutral-50"
          : "border-neutral-300 bg-white hover:border-neutral-500",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={onPick}
      />

      {state.kind === "idle" && (
        <div className="text-center space-y-1">
          <p className="text-sm font-medium">PDF를 드래그하거나 클릭해 선택</p>
          <p className="text-xs text-neutral-500">
            강의안·강의 슬라이드 (~30MB 이하)
          </p>
        </div>
      )}

      {state.kind === "uploading" && (
        <div className="space-y-2">
          <p className="text-sm font-medium truncate">{state.fileName}</p>
          <div className="h-1.5 w-full overflow-hidden rounded bg-neutral-100">
            <div
              className="h-full bg-neutral-900 transition-all"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500">
            {state.progress < 100
              ? `업로드 중 ${state.progress}%`
              : "업로드 완료. 분석 시작..."}
          </p>
        </div>
      )}

      {state.kind === "error" && (
        <div className="space-y-1 text-center">
          <p className="text-sm text-red-600">{state.message}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setState({ kind: "idle" })
            }}
            className="text-xs underline text-neutral-600"
          >
            다시 시도
          </button>
        </div>
      )}
    </div>
  )
}

function uploadWithProgress(
  file: File,
  onProgress: (percent: number) => void
): Promise<UploadedDocument> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/documents/upload")
    xhr.withCredentials = true

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error("invalid server response"))
        }
      } else {
        try {
          const j = JSON.parse(xhr.responseText)
          reject(new Error(j.error ?? `HTTP ${xhr.status}`))
        } catch {
          reject(new Error(`HTTP ${xhr.status}`))
        }
      }
    })

    xhr.addEventListener("error", () => reject(new Error("network error")))

    const form = new FormData()
    form.append("file", file)
    xhr.send(form)
  })
}
