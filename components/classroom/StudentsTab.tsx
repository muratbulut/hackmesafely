import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toneOf } from "@/components/roadmap/NeighborhoodIcon";
import { matchesSearch, percent, statusCounts, type StudentStatus } from "@/lib/classroom/teacher-rules";
import { format, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Initial, LabDots, statusFg, statusFill, statusOrder } from "./parts";
import type { ClassroomDetailData, StudentView } from "./types";

export type StudentFilter = "all" | StudentStatus;
const filters: StudentFilter[] = ["all", ...statusOrder];

type SortKey = "name" | "homework" | "total" | `hood:${number}`;
type Sort = { key: SortKey; dir: 1 | -1 };

const doneCount = (s: StudentView) => s.homework.filter(Boolean).length;

/**
 * Sınıf detayı > Öğrenciler (hoca öncesi kontrol 33, Murat: B Tablo). Arama ve ödevdeki duruma
 * göre süzgeç; masaüstünde her mahalle bir sütun olan, başlığına dokununca sıralanan tablo,
 * telefonda iki satırlı liste ve "Sırala" seçimi. Satıra dokununca öğrenci çekmecesi açılır.
 * Yalnızca hangi odaları bitirdiği görünür; puan ve rapor yok. Odası olmayan mahalle sütun olmaz.
 */
export function StudentsTab({
  data,
  initialFilter = "all",
  onOpenStudent,
}: {
  data: ClassroomDetailData;
  initialFilter?: StudentFilter;
  onOpenStudent: (id: string) => void;
}) {
  const t = getMessages().classroom;
  const s = t.detail.students;
  const hw = data.homework;
  const tone = toneOf(hw?.color ?? "accent");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StudentFilter>(hw ? initialFilter : "all");
  const [sort, setSort] = useState<Sort>({ key: hw ? "homework" : "total", dir: 1 });
  const hoods = data.hoods.map((hood, index) => ({ hood, index })).filter(({ hood }) => hood.labCount > 0);
  const counts = useMemo(() => statusCounts(data.students.map((x) => x.status)), [data.students]);

  const list = useMemo(() => {
    const value = (x: StudentView) =>
      sort.key === "homework" ? doneCount(x) : sort.key === "total" ? x.total : sort.key.startsWith("hood:") ? (x.byHood[Number(sort.key.slice(5))] ?? 0) : 0;
    const byName = (a: StudentView, b: StudentView) => a.name.localeCompare(b.name, "tr");
    return data.students
      .filter((x) => matchesSearch(x.name, query) && (filter === "all" || x.status === filter))
      .sort((a, b) => (sort.key === "name" ? byName(a, b) * sort.dir : (value(a) - value(b)) * sort.dir || byName(a, b)));
  }, [data.students, query, filter, sort]);

  const toggleSort = (key: SortKey) => setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  const headProps = { sort, onSort: toggleSort };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <label className="relative block min-w-0 lg:w-[300px]">
          <span className="sr-only">{s.search}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-fg-4" strokeWidth={2} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={s.search}
            className="h-11 w-full rounded-xl border border-line bg-canvas pr-3.5 pl-10 text-base text-fg placeholder:text-fg-4 focus:border-accent focus:outline-none"
          />
        </label>
        {hw ? (
          <div
            role="group"
            aria-label={s.filtersLabel}
            className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:rounded-xl lg:border lg:border-line lg:bg-surface lg:p-1"
          >
            {filters.map((key) => {
              const count = key === "all" ? data.students.length : counts[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  aria-label={format(s.filterCount, { label: s.filters[key], count })}
                  onClick={() => setFilter(key)}
                  className={cn(
                    "inline-flex h-10 flex-none cursor-pointer items-center gap-2 rounded-[10px] px-3 text-[13px] font-bold whitespace-nowrap lg:h-9",
                    filter === key ? "bg-accent text-on-accent" : "text-fg-2 hover:bg-card max-lg:border max-lg:border-line max-lg:bg-surface",
                  )}
                >
                  {key !== "all" ? <span aria-hidden="true" className={cn("size-2 rounded-full", statusFill[key])} /> : null}
                  {s.filters[key]}
                  <span className={cn("rounded-full px-1.5 text-[11px]", filter === key ? "bg-on-accent/20" : "bg-card")}>{count}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {list.length === 0 ? (
        <p className="m-0 rounded-[14px] border border-dashed border-line p-5 text-center text-sm text-fg-3">{s.noMatch}</p>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-line bg-surface">
          {/* Masaüstü: tablo. */}
          <table className="hidden w-full border-separate border-spacing-0 text-left lg:table">
            <thead className="bg-surface-raised">
              <tr>
                <Head k="name" className="pl-5" {...headProps}>
                  {s.columns.student}
                </Head>
                {hw ? (
                  <Head k="homework" {...headProps}>
                    {format(s.columns.homework, { name: hw.name })}
                  </Head>
                ) : null}
                {hoods.map(({ hood, index }) => (
                  <Head key={hood.id} k={`hood:${index}`} className="text-center" {...headProps}>
                    <span aria-hidden="true" className={cn("size-2 rounded-full", toneOf(hood.color).fill)} />
                    {hood.name}
                  </Head>
                ))}
                <Head k="total" className="text-right" {...headProps}>
                  {s.columns.total}
                </Head>
                <th scope="col" className="px-5 py-2.5 text-right text-xs font-bold text-fg-3">
                  {s.columns.last}
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((student) => {
                const done = doneCount(student);
                return (
                  <tr key={student.id} onClick={() => onOpenStudent(student.id)} className="group cursor-pointer">
                    <th scope="row" className="border-t border-card py-2 pr-3 pl-5 font-normal group-hover:bg-surface-raised">
                      <button type="button" onClick={() => onOpenStudent(student.id)} className="flex min-h-10 cursor-pointer items-center gap-3 text-left text-fg">
                        <Initial name={student.name} className="size-8 text-sm" />
                        <span className="flex flex-col">
                          <b className="text-sm">{student.name}</b>
                          <span className="text-[11px] text-fg-4">{format(s.joined, { date: student.joined })}</span>
                        </span>
                      </button>
                    </th>
                    {hw ? (
                      <td className="border-t border-card px-3 py-2 group-hover:bg-surface-raised">
                        <span className="flex items-center gap-3">
                          <LabDots done={student.homework} fill={tone.fill} size="size-3" />
                          <b className={cn("text-[13px]", student.status ? statusFg[student.status] : "")}>
                            <span aria-hidden="true">{format(s.progress, { done, total: student.homework.length })}</span>
                            <span className="sr-only">{format(s.progressLabel, { done, total: student.homework.length })}</span>
                          </b>
                          {student.status ? <span className={cn("text-xs", statusFg[student.status])}>{s.filters[student.status]}</span> : null}
                        </span>
                      </td>
                    ) : null}
                    {hoods.map(({ hood, index }) => {
                      const n = student.byHood[index] ?? 0;
                      return (
                        <td key={hood.id} className="border-t border-card px-2 py-2 text-center group-hover:bg-surface-raised">
                          <span className="mx-auto flex w-16 flex-col items-center gap-1">
                            <span aria-hidden="true" className="block h-1.5 w-full overflow-hidden rounded-full bg-card">
                              <span className={cn("block h-full rounded-full", toneOf(hood.color).fill)} style={{ width: `${percent(n, hood.labCount)}%` }} />
                            </span>
                            <span className="text-[11px] text-fg-3">
                              <span aria-hidden="true">{format(s.hood, { done: n, total: hood.labCount })}</span>
                              <span className="sr-only">{format(s.hoodLabel, { name: hood.name, done: n, total: hood.labCount })}</span>
                            </span>
                          </span>
                        </td>
                      );
                    })}
                    <td className="border-t border-card px-3 py-2 text-right text-sm font-bold group-hover:bg-surface-raised">
                      <span aria-hidden="true">
                        {student.total}
                        <span className="text-xs font-normal text-fg-4">{format(t.ofTotal, { total: data.labTotal })}</span>
                      </span>
                      <span className="sr-only">{format(s.allLabsLabel, { done: student.total })}</span>
                    </td>
                    <td className="border-t border-card px-5 py-2 text-right text-xs text-fg-3 group-hover:bg-surface-raised">{student.last ?? s.noLast}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Telefon: iki satırlı liste, aynı sıralama. */}
          <div className="flex items-center justify-between gap-3 border-b border-card px-4 py-2 lg:hidden">
            <span className="text-xs font-bold text-fg-3">{format(s.count, { count: list.length })}</span>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-fg-3">
              {s.sort}
              <select
                value={sort.key === "homework" || sort.key === "total" || sort.key === "name" ? sort.key : "total"}
                onChange={(e) => setSort({ key: e.target.value as SortKey, dir: 1 })}
                className="h-10 rounded-[10px] border border-line bg-canvas px-2 text-[13px] text-fg"
              >
                {(hw ? (["homework", "total", "name"] as const) : (["total", "name"] as const)).map((key) => (
                  <option key={key} value={key}>
                    {s.sortOptions[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul className="m-0 flex list-none flex-col p-0 lg:hidden">
            {list.map((student) => {
              const done = doneCount(student);
              return (
                <li key={student.id} className="border-b border-card last:border-0">
                  <button type="button" onClick={() => onOpenStudent(student.id)} className="flex w-full cursor-pointer flex-col gap-2 px-4 py-3 text-left text-fg">
                    <span className="flex items-center gap-3">
                      <Initial name={student.name} className="size-8 text-sm" />
                      <b className="min-w-0 flex-1 truncate text-sm">{student.name}</b>
                      {hw ? (
                        <>
                          <LabDots done={student.homework} fill={tone.fill} />
                          <b className={cn("w-8 text-right text-[13px]", student.status ? statusFg[student.status] : "")}>
                            <span aria-hidden="true">{format(s.progress, { done, total: student.homework.length })}</span>
                            <span className="sr-only">{format(s.progressLabel, { done, total: student.homework.length })}</span>
                          </b>
                        </>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2 pl-11">
                      {hoods.map(({ hood, index }) => (
                        <span key={hood.id} aria-hidden="true" className="block h-1.5 flex-1 overflow-hidden rounded-full bg-card">
                          <span
                            className={cn("block h-full rounded-full", toneOf(hood.color).fill)}
                            style={{ width: `${percent(student.byHood[index] ?? 0, hood.labCount)}%` }}
                          />
                        </span>
                      ))}
                      <span className="flex-none text-[11px] text-fg-4">
                        <span aria-hidden="true">{format(s.rooms, { count: student.total })}</span>
                        <span className="sr-only">{format(s.allLabsLabel, { done: student.total })}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="m-0 text-xs text-fg-4">{s.footnote}</p>
    </div>
  );
}

/** Sıralanan sütun başlığı: dokununca artan, yeniden dokununca azalan. */
function Head({ k, sort, onSort, className, children }: { k: SortKey; sort: Sort; onSort: (k: SortKey) => void; className?: string; children: ReactNode }) {
  const on = sort.key === k;
  const Icon = !on ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={cn("px-3 py-2.5 text-xs font-bold text-fg-3", className)}>
      <button type="button" onClick={() => onSort(k)} className={cn("inline-flex min-h-8 cursor-pointer items-center gap-1 hover:text-fg", on && "text-fg")}>
        {children}
        <Icon className="size-3" strokeWidth={2} aria-hidden="true" />
      </button>
    </th>
  );
}
