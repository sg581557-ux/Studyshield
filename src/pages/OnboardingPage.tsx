import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Target, Clock, Sparkles, Rocket, ChevronLeft, ChevronRight,
  GraduationCap, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { examCatalog, examCategories, searchExams, type ExamCategory, type ExamEntry } from '../data/exams';
import { getExamSubjects } from '../data/examSubjects';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Input, Select, Label, Textarea } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Badge } from '../components/ui/Badge';
import type {
  OnboardingData, SubjectProgress, RevisionFrequency, StudySessionLength, EducationBoard, ClassLevel, ExamGoal,
} from '../types';

const TOTAL_STEPS = 4;
const SESSION_LENGTHS: StudySessionLength[] = [30, 45, 60, 90, 120];
const REVISION_FREQUENCIES: RevisionFrequency[] = ['daily', 'every-2-days', 'weekly'];
const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const QUICK_YEARS = ['2026', '2027', '2028', '2029'];

const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};

function createSubjectProgress(): SubjectProgress {
  return {
    currentChapter: '',
    completedChapters: [],
    backlogChapters: [],
    weakTopics: '',
    strongTopics: '',
    confidence: 5,
  };
}

function deriveBoard(exam: ExamEntry | undefined): EducationBoard {
  if (!exam) return 'CBSE';
  if (exam.id.startsWith('cbse')) return 'CBSE';
  if (exam.id === 'isc' || exam.id === 'icse') return 'ICSE';
  if (exam.category === 'School') return 'State Board';
  return 'Other';
}

function deriveClassLevel(exam: ExamEntry | undefined): ClassLevel {
  if (!exam) return '11';
  if (exam.id === 'cbse-10') return '10';
  if (exam.id === 'cbse-12' || exam.id === 'isc' || exam.id === 'icse') return '12';
  return '11';
}

function buildOnboardingData(
  fullName: string,
  exam: ExamEntry | undefined,
  schedule: SchedulePrefs,
): OnboardingData {
  const subjects: Record<string, SubjectProgress> = {};
  const subjectOrder: string[] = [];
  if (exam) {
    for (const s of getExamSubjects(exam.id)) {
      subjects[s.name] = createSubjectProgress();
      subjectOrder.push(s.name);
    }
  }
  return {
    fullName,
    board: deriveBoard(exam),
    classLevel: deriveClassLevel(exam),
    examGoal: (exam?.name ?? 'Custom') as ExamGoal,
    wakeUpTime: schedule.wakeUpTime,
    sleepTime: schedule.sleepTime,
    schoolStart: schedule.schoolStart,
    schoolEnd: schedule.schoolEnd,
    coachingStart: schedule.coachingStart,
    coachingEnd: schedule.coachingEnd,
    dailyStudyHours: schedule.dailyStudyHours,
    preferredSessionLength: schedule.preferredSessionLength,
    subjects,
    maxTasksPerDay: schedule.maxTasksPerDay,
    preferredSubjectOrder: subjectOrder,
    breakDuration: schedule.breakDuration,
    revisionFrequency: schedule.revisionFrequency,
    weeklyMockTestDay: schedule.weeklyMockTestDay,
    dailyQuestionTarget: schedule.dailyQuestionTarget,
    dailyStudyHourTarget: schedule.dailyStudyHourTarget,
    weeklyRevisionTarget: schedule.weeklyRevisionTarget,
    monthlyGoals: schedule.monthlyGoals,
  };
}

interface SchedulePrefs {
  wakeUpTime: string;
  sleepTime: string;
  schoolStart: string;
  schoolEnd: string;
  coachingStart: string;
  coachingEnd: string;
  dailyStudyHours: number;
  preferredSessionLength: StudySessionLength;
  maxTasksPerDay: number;
  breakDuration: number;
  revisionFrequency: RevisionFrequency;
  weeklyMockTestDay: number;
  dailyQuestionTarget: number;
  dailyStudyHourTarget: number;
  weeklyRevisionTarget: number;
  monthlyGoals: string;
}

const defaultSchedule: SchedulePrefs = {
  wakeUpTime: '06:00',
  sleepTime: '23:00',
  schoolStart: '08:00',
  schoolEnd: '15:00',
  coachingStart: '16:00',
  coachingEnd: '19:00',
  dailyStudyHours: 6,
  preferredSessionLength: 60,
  maxTasksPerDay: 5,
  breakDuration: 10,
  revisionFrequency: 'daily',
  weeklyMockTestDay: 0,
  dailyQuestionTarget: 50,
  dailyStudyHourTarget: 6,
  weeklyRevisionTarget: 3,
  monthlyGoals: '',
};

function OnboardingPage() {
  const { user, completeOnboarding, updateUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 1 — exam selection
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ExamCategory | 'All'>('All');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);

  // Step 2 — target year
  const [targetYear, setTargetYear] = useState('');

  // Step 3 — schedule
  const [schedule, setSchedule] = useState<SchedulePrefs>(defaultSchedule);

  const [submitting, setSubmitting] = useState(false);

  const filteredExams = useMemo(() => {
    let list = searchExams(searchQuery);
    if (activeCategory !== 'All') {
      list = list.filter((e) => e.category === activeCategory);
    }
    return list;
  }, [searchQuery, activeCategory]);

  const selectedExam = useMemo(
    () => examCatalog.find((e) => e.id === selectedExamId) ?? null,
    [selectedExamId],
  );

  const canProceed = useMemo(() => {
    if (step === 0) return selectedExamId !== null;
    if (step === 1) return targetYear.trim().length > 0;
    return true;
  }, [step, selectedExamId, targetYear]);

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };
  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  };

  const updateSchedule = <K extends keyof SchedulePrefs>(key: K, value: SchedulePrefs[K]) => {
    setSchedule((prev) => ({ ...prev, [key]: value }));
  };

  const handleComplete = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    try {
      const data = buildOnboardingData(user.name, selectedExam ?? undefined, schedule);
      localStorage.setItem(`studyshield:user:${user.id}:onboarding`, JSON.stringify(data));
      await updateUser({
        examId: selectedExamId ?? undefined,
        examGoal: selectedExam?.name ?? 'Custom',
        targetYear,
      });
      await completeOnboarding();
      navigate('/dashboard');
    } catch (err) {
      console.error('Onboarding failed:', err);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-950 text-gray-100 flex flex-col items-center px-4 py-8 sm:py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/30">
            <Sparkles className="w-5 h-5 text-accent-light" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">StudyShield Onboarding</h1>
            <p className="text-sm text-gray-400">Let's set up your study command center</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <ProgressBar percentage={((step + 1) / TOTAL_STEPS) * 100} className="flex-1" />
          <span className="text-xs font-medium text-gray-400 tabular-nums whitespace-nowrap">
            Step {step + 1} / {TOTAL_STEPS}
          </span>
        </div>
      </motion.div>

      {/* Step content */}
      <div className="w-full max-w-4xl">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {/* Step 1: Exam Selection */}
            {step === 0 && (
              <GlassCard className="p-6 sm:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-accent-light" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">What are you preparing for?</h2>
                </div>
                <p className="text-sm text-gray-400 mb-5 ml-12">
                  Search or browse to select your target exam.
                </p>

                {/* Search bar */}
                <div className="relative mb-5">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    type="text"
                    placeholder="Search exams… (e.g. JEE, NEET, UPSC, CAT)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Category tabs */}
                <div className="flex gap-2 overflow-x-auto pb-3 mb-5 -mx-1 px-1 scrollbar-thin">
                  <CategoryTab
                    label="All"
                    active={activeCategory === 'All'}
                    onClick={() => setActiveCategory('All')}
                  />
                  {examCategories.map((cat) => (
                    <CategoryTab
                      key={cat}
                      label={cat}
                      active={activeCategory === cat}
                      onClick={() => setActiveCategory(cat)}
                    />
                  ))}
                </div>

                {/* Exam grid */}
                {filteredExams.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No exams found. Try a different search.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredExams.map((exam) => {
                      const isSelected = selectedExamId === exam.id;
                      return (
                        <motion.button
                          key={exam.id}
                          type="button"
                          onClick={() => setSelectedExamId(exam.id)}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className={[
                            'relative text-left p-4 rounded-xl border transition-all duration-200',
                            isSelected
                              ? 'border-accent bg-accent/10 shadow-lg shadow-accent/20'
                              : 'border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] hover:bg-white/[0.05]',
                          ].join(' ')}
                        >
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            </motion.div>
                          )}
                          <p className="font-medium text-sm text-white pr-6 leading-snug">
                            {exam.name}
                          </p>
                          <div className="mt-2">
                            <Badge variant={isSelected ? 'accent' : 'default'}>{exam.category}</Badge>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            )}

            {/* Step 2: Target Year */}
            {step === 1 && (
              <GlassCard className="p-6 sm:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
                    <Target className="w-5 h-5 text-accent-light" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">When is your exam?</h2>
                </div>
                <p className="text-sm text-gray-400 mb-5 ml-12">
                  Tell us your target so we can pace your preparation.
                </p>

                <Label htmlFor="targetYear">Target year / exam session</Label>
                <Input
                  id="targetYear"
                  type="text"
                  placeholder="e.g. JEE 2028, NEET 2027, CA Foundation Dec 2026, UPSC 2028"
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                />

                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Quick select</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_YEARS.map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setTargetYear(yr)}
                        className={[
                          'px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200',
                          targetYear === yr
                            ? 'border-accent bg-accent/15 text-accent-light'
                            : 'border-white/[0.06] bg-white/[0.03] text-gray-300 hover:border-white/[0.12] hover:bg-white/[0.05]',
                        ].join(' ')}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedExam && (
                  <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
                    <GraduationCap className="w-4 h-4 text-accent-light" />
                    <span>Selected exam: <span className="text-white font-medium">{selectedExam.name}</span></span>
                  </div>
                )}
              </GlassCard>
            )}

            {/* Step 3: Schedule & Preferences */}
            {step === 2 && (
              <GlassCard className="p-6 sm:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-accent-light" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Schedule &amp; Preferences</h2>
                </div>
                <p className="text-sm text-gray-400 mb-6 ml-12">
                  Set your daily routine so we can build a realistic plan.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="wakeUpTime">Wake up time</Label>
                    <Input id="wakeUpTime" type="time" value={schedule.wakeUpTime} onChange={(e) => updateSchedule('wakeUpTime', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="sleepTime">Sleep time</Label>
                    <Input id="sleepTime" type="time" value={schedule.sleepTime} onChange={(e) => updateSchedule('sleepTime', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="schoolStart">School start</Label>
                    <Input id="schoolStart" type="time" value={schedule.schoolStart} onChange={(e) => updateSchedule('schoolStart', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="schoolEnd">School end</Label>
                    <Input id="schoolEnd" type="time" value={schedule.schoolEnd} onChange={(e) => updateSchedule('schoolEnd', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="coachingStart">Coaching start</Label>
                    <Input id="coachingStart" type="time" value={schedule.coachingStart} onChange={(e) => updateSchedule('coachingStart', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="coachingEnd">Coaching end</Label>
                    <Input id="coachingEnd" type="time" value={schedule.coachingEnd} onChange={(e) => updateSchedule('coachingEnd', e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="dailyStudyHours">Daily study hours</Label>
                    <Input id="dailyStudyHours" type="number" min={0} max={16} value={schedule.dailyStudyHours} onChange={(e) => updateSchedule('dailyStudyHours', Number(e.target.value))} />
                  </div>
                  <div>
                    <Label htmlFor="preferredSessionLength">Preferred session length (min)</Label>
                    <Select id="preferredSessionLength" value={schedule.preferredSessionLength} onChange={(e) => updateSchedule('preferredSessionLength', Number(e.target.value) as StudySessionLength)}>
                      {SESSION_LENGTHS.map((len) => (
                        <option key={len} value={len}>{len}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="maxTasksPerDay">Max tasks per day</Label>
                    <Input id="maxTasksPerDay" type="number" min={1} max={20} value={schedule.maxTasksPerDay} onChange={(e) => updateSchedule('maxTasksPerDay', Number(e.target.value))} />
                  </div>
                  <div>
                    <Label htmlFor="breakDuration">Break duration (min)</Label>
                    <Input id="breakDuration" type="number" min={1} max={60} value={schedule.breakDuration} onChange={(e) => updateSchedule('breakDuration', Number(e.target.value))} />
                  </div>
                  <div>
                    <Label htmlFor="revisionFrequency">Revision frequency</Label>
                    <Select id="revisionFrequency" value={schedule.revisionFrequency} onChange={(e) => updateSchedule('revisionFrequency', e.target.value as RevisionFrequency)}>
                      {REVISION_FREQUENCIES.map((freq) => (
                        <option key={freq} value={freq}>{freq}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="weeklyMockTestDay">Weekly mock test day</Label>
                    <Select id="weeklyMockTestDay" value={schedule.weeklyMockTestDay} onChange={(e) => updateSchedule('weeklyMockTestDay', Number(e.target.value))}>
                      {WEEK_DAYS.map((day, idx) => (
                        <option key={day} value={idx}>{day}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dailyQuestionTarget">Daily question target</Label>
                    <Input id="dailyQuestionTarget" type="number" min={0} max={500} value={schedule.dailyQuestionTarget} onChange={(e) => updateSchedule('dailyQuestionTarget', Number(e.target.value))} />
                  </div>
                  <div>
                    <Label htmlFor="dailyStudyHourTarget">Daily study hour target</Label>
                    <Input id="dailyStudyHourTarget" type="number" min={0} max={16} value={schedule.dailyStudyHourTarget} onChange={(e) => updateSchedule('dailyStudyHourTarget', Number(e.target.value))} />
                  </div>
                  <div>
                    <Label htmlFor="weeklyRevisionTarget">Weekly revision target</Label>
                    <Input id="weeklyRevisionTarget" type="number" min={0} max={20} value={schedule.weeklyRevisionTarget} onChange={(e) => updateSchedule('weeklyRevisionTarget', Number(e.target.value))} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="monthlyGoals">Monthly goals</Label>
                    <Textarea id="monthlyGoals" rows={3} placeholder="e.g. Finish Physics mechanics, complete 5 mock tests, revise all of Calculus…"
                      value={schedule.monthlyGoals} onChange={(e) => updateSchedule('monthlyGoals', e.target.value)} />
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Step 4: Review & Confirm */}
            {step === 3 && (
              <GlassCard className="p-6 sm:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center">
                    <Rocket className="w-5 h-5 text-accent-light" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Review &amp; Confirm</h2>
                </div>
                <p className="text-sm text-gray-400 mb-6 ml-12">
                  Here's a summary of your setup. Launch when you're ready.
                </p>

                <div className="space-y-3">
                  <ReviewRow icon={<GraduationCap className="w-4 h-4" />} label="Exam">
                    {selectedExam ? (
                      <span className="text-white font-medium">{selectedExam.name}</span>
                    ) : (
                      <span className="text-gray-500 italic">Not selected</span>
                    )}
                    {selectedExam && <Badge variant="accent" className="ml-2">{selectedExam.category}</Badge>}
                  </ReviewRow>

                  <ReviewRow icon={<Target className="w-4 h-4" />} label="Target year">
                    <span className="text-white font-medium">{targetYear || '—'}</span>
                  </ReviewRow>

                  <ReviewRow icon={<Clock className="w-4 h-4" />} label="Daily routine">
                    <span className="text-gray-300">
                      Wake {schedule.wakeUpTime} · Sleep {schedule.sleepTime}
                    </span>
                  </ReviewRow>

                  <ReviewRow icon={<Clock className="w-4 h-4" />} label="School">
                    <span className="text-gray-300">
                      {schedule.schoolStart} – {schedule.schoolEnd}
                    </span>
                  </ReviewRow>

                  <ReviewRow icon={<Clock className="w-4 h-4" />} label="Coaching">
                    <span className="text-gray-300">
                      {schedule.coachingStart} – {schedule.coachingEnd}
                    </span>
                  </ReviewRow>

                  <ReviewRow icon={<Clock className="w-4 h-4" />} label="Study plan">
                    <span className="text-gray-300">
                      {schedule.dailyStudyHours}h/day · {schedule.preferredSessionLength}min sessions · {schedule.breakDuration}min breaks
                    </span>
                  </ReviewRow>

                  <ReviewRow icon={<CheckCircle2 className="w-4 h-4" />} label="Revision">
                    <span className="text-gray-300 capitalize">
                      {schedule.revisionFrequency} · mock test on {WEEK_DAYS[schedule.weeklyMockTestDay]}
                    </span>
                  </ReviewRow>

                  <ReviewRow icon={<CheckCircle2 className="w-4 h-4" />} label="Targets">
                    <span className="text-gray-300">
                      {schedule.dailyQuestionTarget} questions/day · {schedule.dailyStudyHourTarget}h study/day · {schedule.weeklyRevisionTarget} revisions/week
                    </span>
                  </ReviewRow>

                  {selectedExam && (
                    <ReviewRow icon={<GraduationCap className="w-4 h-4" />} label="Subjects">
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {getExamSubjects(selectedExam.id).map((s) => (
                          <Badge key={s.name} variant="default">{s.name}</Badge>
                        ))}
                      </div>
                    </ReviewRow>
                  )}
                </div>

                {schedule.monthlyGoals && (
                  <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-xs font-medium text-gray-500 mb-1">Monthly goals</p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{schedule.monthlyGoals}</p>
                  </div>
                )}
              </GlassCard>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="ghost"
            size="md"
            onClick={goBack}
            disabled={step === 0 || submitting}
            className={step === 0 ? 'invisible' : ''}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>

          {step < TOTAL_STEPS - 1 ? (
            <Button variant="primary" size="md" onClick={goNext} disabled={!canProceed}>
              Continue
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              onClick={handleComplete}
              disabled={submitting || !selectedExam}
            >
              <Rocket className="w-4 h-4" />
              {submitting ? 'Launching…' : 'Launch StudyShield'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-all duration-200',
        active
          ? 'border-accent bg-accent/15 text-accent-light'
          : 'border-white/[0.06] bg-white/[0.03] text-gray-400 hover:border-white/[0.12] hover:text-gray-200',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function ReviewRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-2 text-gray-400 text-sm shrink-0">
        <span className="text-accent-light">{icon}</span>
        {label}
      </div>
      <div className="text-right text-sm min-w-0">{children}</div>
    </div>
  );
}

export default OnboardingPage;
