import type { Task } from "@/lib/lesson";
import { pick, type Dict, type Lang } from "@/lib/i18n";

/** Read-only view of a task, used in the teacher editor, sample page and print. */
export function TaskPreview({ task, index, d, lang, showKey, paper = false }: { task: Task; index: number; d: Dict; lang: Lang; showKey: boolean; paper?: boolean }) {
  return (
    <div className="avoid-break rounded-xl border border-leaf-100 p-4 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-bold">
          {index}. {pick(task.instruction, lang)}
        </div>
        <div className="text-xs font-semibold text-muted">
          {d.teacher.taskTypes[task.type]} · {task.points} {d.common.points}
        </div>
      </div>
      {task.prompt && <p className="mt-2 whitespace-pre-line" lang="en">{task.prompt}</p>}
      {task.type === "choice" && (
        <ol className="mt-2 space-y-1 list-[upper-alpha] pl-6" lang="en">
          {task.options.map((o, i) => (
            <li key={i} className={showKey && task.correct.includes(i) ? "font-bold text-leaf-700" : ""}>
              {paper && "☐ "}
              {o}
              {showKey && task.correct.includes(i) ? " ✓" : ""}
            </li>
          ))}
        </ol>
      )}
      {task.type === "match" && (
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm" lang="en">
          {task.pairs.map((p, i) => (
            <div key={i} className="contents">
              <div>{i + 1}. {p.left}</div>
              <div>{showKey ? <b className="text-leaf-700">{p.right}</b> : <span>{String.fromCharCode(65 + i)}. {sortedRight(task)[i]}</span>}</div>
            </div>
          ))}
          {paper && !showKey && <div className="col-span-2 text-xs text-muted mt-1">{d.print.matchHelp}</div>}
        </div>
      )}
      {task.type === "gap" && (
        <div className="mt-2" lang="en">
          <p>{task.text.replace(/_{3,}/g, " ________ ")}</p>
          {showKey && <p className="text-sm text-leaf-700 mt-1 font-semibold">{d.teacher.answerKey}: {task.answers.map((a) => a.join(" / ")).join("; ")}</p>}
        </div>
      )}
      {(task.type === "short" || task.type === "voice") && showKey && task.sample_answer && (
        <p className="mt-2 text-sm text-leaf-700"><b>{d.teacher.answerKey}:</b> {task.sample_answer}</p>
      )}
      {task.type === "pair" && task.roles.length > 0 && (
        <ul className="mt-2 text-sm list-disc pl-5" lang="en">{task.roles.map((r, i) => <li key={i}>{r}</li>)}</ul>
      )}
      {paper && (task.type === "short" || task.type === "gap") && !showKey && (
        <div className="mt-3 space-y-5">
          <div className="text-xs text-muted">{d.print.answerSpace}:</div>
          <div className="border-b border-dashed border-gray-400" />
          <div className="border-b border-dashed border-gray-400" />
          {task.type === "short" && <div className="border-b border-dashed border-gray-400" />}
        </div>
      )}
      {paper && task.type === "voice" && !showKey && <div className="mt-2 text-xs text-muted">{d.print.recordHelp}</div>}
      {task.hint && !paper && <p className="mt-2 text-xs text-muted">💡 {pick(task.hint, lang)}</p>}
    </div>
  );
}

function sortedRight(task: Extract<Task, { type: "match" }>) {
  return [...task.pairs.map((p) => p.right)].sort((a, b) => a.localeCompare(b));
}
