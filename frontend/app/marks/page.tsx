'use client'

import { SearchRecord } from "@/components/searchTable/SearchTable";
import SearchTable from "@/components/searchTable/SearchTable";
import MainLayout from "@/layouts/MainLayout";
import { useAuth } from "@/context/authContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import Loader from "@/components/loader/Loader";

interface StudentPerformance {
    group_id: number;
    task_creator_id: number;
    student_id: number;
    task_id: number;
    task_title: string;
    task_created_at: string;
    answer_id: number;
    mark: number | null;
    subject: string;
}

interface TaskData {
    mark: number | null;
    title: string;
    answer_id: number | null;
}

export default function MarksPage() {
    const router = useRouter();
    const auth = useAuth();

    if (!auth) return null;
    const { user, loading: authLoading, get } = auth;

    // Состояния
    const [loading, setLoading] = useState(true);
    const [accessLevel, setAccessLevel] = useState(0);
    const [taskNum, setTaskNum] = useState('0');
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [selectedMark, setSelectedMark] = useState<string>('');
    const [sidebarItems, setSidebarItems] = useState<{
        id: number,
        el: string,
    }[]>([{ id: 0, el: 'Все задания' }]);
    const [searchProps, setSearchProps] = useState<SearchRecord[]>([]);
    const [compactModeEnabled, setCompactModeEnabled] = useState(false);
    const [performanceData, setPerformanceData] = useState<any>(null);
    const [teacherGroups, setTeacherGroups] = useState<any[]>([]);

    // Состояния для таблицы студента
    const [studentSubjects, setStudentSubjects] = useState<string[]>([]);
    const [studentTasks, setStudentTasks] = useState<{ id: number; title: string; subject: string, task_created_at:string }[]>([]);
    const [studentMarksMatrix, setStudentMarksMatrix] = useState<Map<string, Map<number, TaskData>>>(new Map());
    const [averageScores, setAverageScores] = useState<Map<string, number>>(new Map());
    const [selectedStudentSubject, setSelectedStudentSubject] = useState<string>('');
    const [selectedStudentTask, setSelectedStudentTask] = useState<string>('');

    // Загрузка пользователя
    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        loadUser();
        loadPerformanceData();
        loadPerformanceDataStudent();
    }, [user, authLoading]);

    const loadUser = async () => {
        try {
            if (user?.role === 'admin') setAccessLevel(3);
            if (user?.role === 'teacher') setAccessLevel(2);
            if (user?.role === 'student' || user?.role === 'parent') setAccessLevel(1);
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error);
            router.push('/login');
        }
    };

    // для админов и учителей
    const loadPerformanceData = async () => {
        setLoading(true);
        try {
            const res = await get('/get-performance');

            let filteredGroups = res.data.groups || [];
            if (user?.role === 'teacher') {
                filteredGroups = filteredGroups.filter((group: any) =>
                    group.teacher?.tutor_id === user.id
                );
                setTeacherGroups(filteredGroups);
            } else {
                setTeacherGroups(filteredGroups);
            }

            const groupedUserIds = new Set<number>();
            const allGroupedStudents: any[] = [];

            filteredGroups.forEach((group: any) => {
                group.students?.forEach((studentGroup: any) => {
                    if (studentGroup.user && studentGroup.user.id) {
                        groupedUserIds.add(studentGroup.user.id);
                        allGroupedStudents.push({
                            student: studentGroup.user,
                            groupId: group.id,
                            groupName: group.name,
                            hasGroup: true
                        });
                    }
                });
            });

            const usersWithAnswersButNoGroup: any[] = [];
            const processedUserIds = new Set<number>();

            res.data.info?.forEach((task: any) => {
                const taskGroup = filteredGroups.find((g: any) => g.id === task.group_id);
                if (user?.role === 'teacher' && !taskGroup) {
                    return;
                }

                task.answers?.forEach((answer: any) => {
                    const userId = answer.user_id;
                    if (userId && !groupedUserIds.has(userId) && !processedUserIds.has(userId)) {
                        processedUserIds.add(userId);
                        usersWithAnswersButNoGroup.push({
                            student: {
                                id: userId,
                                name: answer.user?.name || `Пользователь ${userId}`,
                                email: answer.user?.email,
                                role: answer.user?.role || 'student'
                            },
                            groupId: null,
                            groupName: 'Без группы',
                            hasGroup: false
                        });
                    }
                });
            });

            let filteredTasks = res.data.info || res.info || [];

            if (user?.role === 'teacher') {
                filteredTasks = filteredTasks.filter((task: any) =>
                    filteredGroups.some((group: any) => group.id === task.group_id && task.user_id == user.id)
                );
            }

            const formattedData = {
                groups: filteredGroups,
                tasks: filteredTasks,
                answers: res.data.info?.flatMap((task: any) => task.answers || []),
                allStudents: [...allGroupedStudents, ...usersWithAnswersButNoGroup]
            };

            setPerformanceData(formattedData);

            if (user?.role === 'teacher' || user?.role === 'admin') {
                buildTeacherTableData(formattedData);
            }

        } catch (error: any) {
            console.error('Ошибка загрузки данных:', error);
        } finally {
            setLoading(false);
        }
    };

    // для студентов
    const loadPerformanceDataStudent = async () => {
        if (!user?.id) return;

        if (user?.role !== 'student') return;

        try {
            const res = await get(`get-performance-student/${user.id}`);

            if (res?.data && Array.isArray(res.data.data)) {
                buildStudentTableView(res.data.data);
            } else if (res?.message === 'Студент не состоит в группе') {
                setStudentSubjects([]);
                setStudentTasks([]);
                setStudentMarksMatrix(new Map());
                setAverageScores(new Map());
                setSearchProps([]);
            }
        } catch (error) {
            console.error('Ошибка загрузки данных студента:', error);
        }
    };

    const buildStudentTableView = (data: StudentPerformance[]) => {
        if (!data || data.length === 0) {
            setStudentSubjects([]);
            setStudentTasks([]);
            setStudentMarksMatrix(new Map());
            setAverageScores(new Map());
            setSearchProps([]);
            return;
        }

        const subjects = [...new Set(data.map(item => item.subject))];
        setStudentSubjects(subjects);

        // Собираем уникальные задания с их названиями и предметами
        const tasksMap = new Map<number, { title: string; subject: string, task_created_at:string }>();
        data.forEach(item => {
            if (!tasksMap.has(item.task_id)) {
                tasksMap.set(item.task_id, {
                    title: item.task_title,
                    subject: item.subject,
                    task_created_at: item.task_created_at
                });
            }
        });

        const tasks = Array.from(tasksMap.entries()).map(([id, { title, subject, task_created_at }]) => ({
            id,
            title,
            subject,
            task_created_at
        }));
        setStudentTasks(tasks);

        // Создаем матрицу оценок: предмет -> (id_задания -> TaskData)
        const marksMap = new Map<string, Map<number, TaskData>>();

        subjects.forEach(subject => {
            marksMap.set(subject, new Map());
        });

        data.forEach(item => {
            const subjectMap = marksMap.get(item.subject);
            if (subjectMap) {
                subjectMap.set(item.task_id, {
                    mark: item.mark !== undefined ? item.mark : null,
                    title: item.task_title,
                    answer_id: item.answer_id !== undefined ? item.answer_id : null
                });
            }
        });

        setStudentMarksMatrix(marksMap);

        // Вычисляем средний балл по каждому предмету
        const averages = new Map<string, number>();
        subjects.forEach(subject => {
            const subjectMarks = marksMap.get(subject);
            if (subjectMarks) {
                const marks: number[] = [];
                subjectMarks.forEach((value) => {
                    if (value.mark !== null && value.mark !== undefined && value.mark != 0) {
                        marks.push(value.mark);
                    }
                });
                if (marks.length > 0) {
                    const average = marks.reduce((a, b) => a + b, 0) / marks.length;
                    averages.set(subject, Number(average.toFixed(2)));
                } else {
                    averages.set(subject, 0);
                }
            }
        });
        setAverageScores(averages);

        buildStudentTableDataForCompatibility(data);
    };

    const buildStudentTableDataForCompatibility = (data: StudentPerformance[]) => {
        const records: SearchRecord[] = data.map((item) => ({
            id: item.answer_id,
            task_id: item.task_id,
            title: item.task_title,
            columns: [
                {
                    title: 'Предмет',
                    key: 'subject',
                    data: {
                        value: item.subject,
                        size: 2,
                        isFilter: true,
                        add: 'font-medium'
                    }
                },
                {
                    title: 'Задание',
                    key: 'task_title',
                    data: {
                        value: item.task_title,
                        size: 2,
                        isFilter: true,
                        add: 'text-gray-700'
                    }
                },
                {
                    title: 'Оценка',
                    key: 'mark',
                    data: {
                        value: item.mark !== null ? item.mark.toString() : '',
                        size: 1,
                        add: item.mark !== null && item.mark >= 4 ? 'text-green-600 font-bold' :
                            item.mark !== null && item.mark < 4 ? 'text-red-600' : 'text-gray-400'
                    }
                }
            ]
        }));

        setSearchProps(records);

        // Обновляем sidebarItems с названиями заданий
        if (records.length > 0) {
            const uniqueTasks = new Map();
            records.forEach(record => {
                if (!uniqueTasks.has(record.task_id)) {
                    uniqueTasks.set(record.task_id, record.title);
                }
            });

            const tasksList = Array.from(uniqueTasks.entries()).map(([id, title]) => ({
                id: id as number,
                el: title as string
            }));

            setSidebarItems([{ id: 0, el: 'Все задания' }, ...tasksList]);
        }
    };

    const buildTeacherTableData = (data: any) => {
        const records: SearchRecord[] = [];

        if (!data.tasks || !Array.isArray(data.tasks)) {
            return;
        }

        data.tasks.forEach((task: any) => {
            const taskGroup = data.groups.find((g: any) => g.id === task.group_id);

            if (!taskGroup) {
                return;
            }

            const studentsInTaskGroup = taskGroup.students || [];

            studentsInTaskGroup.forEach((studentGroup: any) => {
                const student = studentGroup.user;
                if (!student) return;

                let answer = null;
                if (task.answers && Array.isArray(task.answers)) {
                    answer = task.answers.find((ans: any) => ans.user_id == student.id);
                }

                const mark = answer?.mark || '—';
                const answerId = answer?.id || null;

                records.push({
                    id: answerId,
                    _uniqueKey: `${task.id}_${student.id}_${answerId || 'no-answer'}`,
                    task_id: task.id,
                    title: task.title,
                    columns: [
                        {
                            title: 'Ученик',
                            key: 'student',
                            data: {
                                value: student?.name || 'Неизвестно',
                                size: 2,
                                isFilter: true,
                                add: 'font-medium'
                            }
                        },
                        {
                            title: 'Задание',
                            key: 'task_title',
                            data: {
                                value: task.title || 'Без названия',
                                size: 2,
                                isFilter: true,
                                add: 'text-gray-700'
                            }
                        },
                        {
                            title: 'Группа',
                            key: 'group',
                            data: {
                                value: taskGroup.name,
                                size: 1,
                                isFilter: true,
                                add: 'text-gray-700'
                            }
                        },
                        {
                            title: 'Оценка',
                            key: 'mark',
                            data: {
                                value: mark,
                                size: 1,
                                add: mark !== '—' && Number(mark) >= 4 ? 'text-green-600 font-bold' :
                                    mark !== '—' && Number(mark) < 4 ? 'text-red-600' : 'text-gray-400'
                            }
                        }
                    ]
                });
            });

            if (accessLevel === 3 && task.answers && Array.isArray(task.answers)) {
                const studentsWithoutGroupForThisTask = task.answers
                    .filter((answer: any) => {
                        const isInAnyGroup = data.groups.some((group: any) =>
                            group.students?.some((sg: any) => sg.user?.id === answer.user_id)
                        );
                        return !isInAnyGroup;
                    })
                    .map((answer: any) => ({
                        student: answer.user || { id: answer.user_id, name: `Пользователь ${answer.user_id}` },
                        answer: answer,
                        groupName: 'Без группы',
                        hasGroup: false
                    }));

                studentsWithoutGroupForThisTask.forEach(({ student, answer }: any) => {
                    if (!student) return;

                    records.push({
                        id: answer.id,
                        _uniqueKey: `${task.id}_${student.id}_${answer.id || 'no-answer'}_nogroup`,
                        task_id: task.id,
                        title: task.title,
                        columns: [
                            {
                                title: 'Ученик',
                                key: 'student',
                                data: {
                                    value: student?.name || 'Неизвестно',
                                    size: 2,
                                    isFilter: true,
                                    add: 'font-medium'
                                }
                            },
                            {
                                title: 'Задание',
                                key: 'task_title',
                                data: {
                                    value: task.title || 'Без названия',
                                    size: 2,
                                    isFilter: true,
                                    add: 'text-gray-700'
                                }
                            },
                            {
                                title: 'Группа',
                                key: 'group',
                                data: {
                                    value: 'Без группы',
                                    size: 1,
                                    isFilter: true,
                                    add: 'text-orange-500 italic font-medium'
                                }
                            },
                            {
                                title: 'Оценка',
                                key: 'mark',
                                data: {
                                    value: answer.mark || '—',
                                    size: 1,
                                    add: answer.mark && Number(answer.mark) >= 4 ? 'text-green-600 font-bold' :
                                        answer.mark && Number(answer.mark) < 4 ? 'text-red-600' : 'text-gray-400'
                                }
                            }
                        ]
                    });
                });
            }
        });

        setSearchProps(records);

        if (data.tasks && Array.isArray(data.tasks)) {
            const tasksList = data.tasks.map((task: any) => ({
                id: task.id,
                el: task.title
            }));
            setSidebarItems([{ id: 0, el: 'Все задания' }, ...tasksList]);
        }
    };

    const handleRowClick = useCallback((record: SearchRecord) => {
        if (record.id && typeof record.id === 'number' || typeof record.id === 'string') {
            router.push(`/answers/${record.id}`);
        }
    }, [router]);

    const handleMarkClick = useCallback((taskId: number, answerId: number | null, mark: number | null) => {
        if (answerId && mark !== null) {
            router.push(`/answers/${answerId}`);
        } else {
            router.push(`/tasks/${taskId}`);
        }
    }, [router]);

    const groupFilterOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [
            { value: '', label: 'Все группы' }
        ];

        if (!teacherGroups || teacherGroups.length === 0) return options;

        teacherGroups.forEach((group: any) => {
            if (group.id && group.name) {
                options.push({ value: group.id.toString(), label: group.name });
            }
        });

        return options;
    }, [teacherGroups, accessLevel]);

    const markFilterOptions = useMemo(() => {
        const marks = new Set<string>();
        marks.add('');

        searchProps.forEach(record => {
            const markColumn = record.columns.find(col => col.key === 'mark');
            const markValue = markColumn?.data.value;
            if (markValue && markValue !== '—' && !isNaN(Number(markValue))) {
                marks.add(markValue.toString());
            }
        });

        return [
            { value: '', label: 'Все оценки' },
            { value: '—', label: 'Нет ответа' },
            { value: '0', label: 'Нет оценки' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
            { value: '5', label: '5' },
        ];
    }, [searchProps]);

    const handleTaskChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setTaskNum(e.target.value);
    }, []);

    const handleGroupChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedGroupId(e.target.value);
    }, []);

    const handleMarkChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMark(e.target.value);
    }, []);

    const filteredSearchProps = useMemo(() => {
        let filtered = searchProps;

        if (selectedGroupId && accessLevel >= 2) {
            if (selectedGroupId === 'no-group') {
                filtered = filtered.filter(record => {
                    const groupColumn = record.columns.find(col => col.key === 'group');
                    const groupValue = groupColumn?.data.value?.toString() || '';
                    return groupValue === 'Без группы';
                });
            } else {
                filtered = filtered.filter(record => {
                    const groupColumn = record.columns.find(col => col.key === 'group');
                    const groupValue = groupColumn?.data.value?.toString() || '';
                    const selectedGroupName = groupFilterOptions.find(opt => opt.value === selectedGroupId)?.label;
                    return groupValue === selectedGroupName;
                });
            }
        }

        if (taskNum !== '0') {
            filtered = filtered.filter(record => record.task_id?.toString() === taskNum);
        }

        if (selectedMark !== '') {
            filtered = filtered.filter(record => {
                const markColumn = record.columns.find(col => col.key === 'mark');
                const markValue = markColumn?.data.value?.toString();
                return markValue === selectedMark;
            });
        }

        return filtered;
    }, [searchProps, selectedGroupId, taskNum, selectedMark, groupFilterOptions, accessLevel]);

    // Фильтрация заданий для студента по предмету
    const filteredStudentTasks = useMemo(() => {
        if (!selectedStudentSubject) return studentTasks;
        return studentTasks.filter(task => task.subject === selectedStudentSubject);
    }, [studentTasks, selectedStudentSubject]);

    // Фильтрация предметов для студента
    const studentSubjectFilterOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [
            { value: '', label: 'Все предметы' }
        ];
        studentSubjects.forEach(subject => {
            options.push({ value: subject, label: subject });
        });
        return options;
    }, [studentSubjects]);

    // Фильтрация заданий для выпадающего списка
    const studentTaskFilterOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [
            { value: '', label: 'Все задания' }
        ];
        filteredStudentTasks.forEach(task => {
            options.push({ value: task.id.toString(), label: task.title });
        });
        return options;
    }, [filteredStudentTasks]);

    // Фильтрованная матрица оценок для студента
    const filteredStudentMarksMatrix = useMemo(() => {
        if (!selectedStudentSubject && !selectedStudentTask) {
            return studentMarksMatrix;
        }

        const newMatrix = new Map<string, Map<number, TaskData>>();

        studentSubjects.forEach(subject => {
            // Фильтр по предмету
            if (selectedStudentSubject && subject !== selectedStudentSubject) {
                return;
            }

            const subjectMarks = studentMarksMatrix.get(subject);
            if (!subjectMarks) return;

            const newSubjectMarks = new Map<number, TaskData>();

            subjectMarks.forEach((value, taskId) => {
                // Фильтр по заданию
                if (selectedStudentTask && taskId.toString() !== selectedStudentTask) {
                    return;
                }
                newSubjectMarks.set(taskId, value);
            });

            if (newSubjectMarks.size > 0) {
                newMatrix.set(subject, newSubjectMarks);
            }
        });

        return newMatrix;
    }, [studentMarksMatrix, studentSubjects, selectedStudentSubject, selectedStudentTask]);

    // Фильтрованные предметы
    const filteredStudentSubjects = useMemo(() => {
        return Array.from(filteredStudentMarksMatrix.keys());
    }, [filteredStudentMarksMatrix]);

    // Пересчет средних баллов для отфильтрованных данных
    const filteredAverageScores = useMemo(() => {
        const averages = new Map<string, number>();
        filteredStudentSubjects.forEach(subject => {
            const subjectMarks = filteredStudentMarksMatrix.get(subject);
            if (subjectMarks) {
                const marks: number[] = [];
                subjectMarks.forEach((value) => {
                    if (value.mark !== null && value.mark !== undefined && value.mark != 0) {
                        marks.push(value.mark);
                    }
                });
                if (marks.length > 0) {
                    const average = marks.reduce((a, b) => a + b, 0) / marks.length;
                    averages.set(subject, Number(average.toFixed(2)));
                } else {
                    averages.set(subject, 0);
                }
            }
        });
        return averages;
    }, [filteredStudentMarksMatrix, filteredStudentSubjects]);

    const calculatePassRate = useCallback(() => {
        let totalMarks = 0;
        let passingMarks = 0;

        filteredStudentSubjects.forEach(subject => {
            const marksByTask = filteredStudentMarksMatrix.get(subject);
            if (marksByTask) {
                marksByTask.forEach((value) => {
                    if (value.mark !== null && value.mark !== undefined && !isNaN(value.mark) && value.mark != 0) {
                        totalMarks++;
                        if (value.mark >= 3) {
                            passingMarks++;
                        }
                    }
                });
            }
        });

        if (totalMarks === 0) return 0;
        return Number(((passingMarks / totalMarks) * 100).toFixed(2));
    }, [filteredStudentSubjects, filteredStudentMarksMatrix]);

    const calculateSuccessRate = useCallback(() => {
        let totalMarks = 0;
        let goodMarks = 0;

        filteredStudentSubjects.forEach(subject => {
            const marksByTask = filteredStudentMarksMatrix.get(subject);
            if (marksByTask) {
                marksByTask.forEach((value) => {
                    if (value.mark !== null && value.mark !== undefined && !isNaN(value.mark) && value.mark != 0) {
                        totalMarks++;
                        if (value.mark >= 4) {
                            goodMarks++;
                        }
                    }
                });
            }
        });

        if (totalMarks === 0) return 0;
        return Number(((goodMarks / totalMarks) * 100).toFixed(2));
    }, [filteredStudentSubjects, filteredStudentMarksMatrix]);

    const calculateOverallAverage = useCallback(() => {
        let totalMarks = 0;
        let markCount = 0;

        filteredStudentSubjects.forEach(subject => {
            const marksByTask = filteredStudentMarksMatrix.get(subject);
            if (marksByTask) {
                marksByTask.forEach((value) => {
                    if (value.mark !== null && value.mark !== undefined && value.mark != 0) {
                        totalMarks += Number(value.mark);
                        markCount++;
                    }
                });
            }
        });

        if (markCount === 0) return 0;
        return Number((totalMarks / markCount).toFixed(2));
    }, [filteredStudentSubjects, filteredStudentMarksMatrix]);

    if (authLoading || loading) {
        return <Loader />;
    }

    if (!user) return null;

    return (
        <MainLayout>
            <div className="mb-8">
                <h2 className="text-4xl font-bold mb-2">Журнал успеваемости</h2>
                <div className="flex items-center gap-2 text-gray-600">
                    <span>Уровень доступа —</span>
                    {accessLevel === 3 && <span className="text-green-600 font-semibold">Администратор</span>}
                    {accessLevel === 2 && <span className="text-blue-600 font-semibold">Учитель</span>}
                    {accessLevel === 1 && <span className="text-purple-600 font-semibold">Ученик</span>}
                </div>
                {user?.role === 'teacher' && teacherGroups.length > 0 && (
                    <div className="mt-2 text-sm text-gray-500">
                        📚 Ваши группы: {teacherGroups.map((g: any) => g.name).join(', ')}
                    </div>
                )}
            </div>

            {/* Для студента показываем матрицу оценок с фильтрами */}
            {accessLevel === 1 ? (
                <>
                    {/* Фильтры для студента */}
                    <div className="mb-6 flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">📚 Предмет:</span>
                            <select
                                className="px-4 py-2 border border-purple-600 rounded-lg bg-white text-purple-600"
                                value={selectedStudentSubject}
                                onChange={(e) => {
                                    setSelectedStudentSubject(e.target.value);
                                    setSelectedStudentTask('');
                                }}
                            >
                                {studentSubjectFilterOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700">📋 Задание:</span>
                            <select
                                className="px-4 py-2 border border-purple-600 rounded-lg bg-white text-purple-600"
                                value={selectedStudentTask}
                                onChange={(e) => setSelectedStudentTask(e.target.value)}
                                disabled={!selectedStudentSubject && filteredStudentTasks.length === 0}
                            >
                                {studentTaskFilterOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {(selectedStudentSubject || selectedStudentTask) && (
                            <button
                                onClick={() => {
                                    setSelectedStudentSubject('');
                                    setSelectedStudentTask('');
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Сбросить фильтры
                            </button>
                        )}
                    </div>

                    {/* Три блока с показателями */}
                    <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white rounded-lg shadow-sm border">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <span className="text-sm font-semibold text-gray-700">Качество знаний</span>
                                    <span className="ml-2 text-xs text-gray-500">(оценки 4 и 5)</span>
                                </div>
                                <span className="text-2xl font-bold text-green-600">{calculateSuccessRate()}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(calculateSuccessRate(), 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-white rounded-lg shadow-sm border">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <span className="text-sm font-semibold text-gray-700">Средний балл</span>
                                </div>
                                <span className={`text-2xl font-bold ${calculateOverallAverage() >= 4 ? 'text-green-600' :
                                    calculateOverallAverage() >= 3 ? 'text-blue-600' : 'text-red-600'
                                    }`}>
                                    {calculateOverallAverage().toFixed(2)}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all duration-300 ${calculateOverallAverage() >= 4 ? 'bg-green-600' :
                                        calculateOverallAverage() >= 3 ? 'bg-blue-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${Math.min((calculateOverallAverage() / 5) * 100, 100)}%` }}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-white rounded-lg shadow-sm border">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <span className="text-sm font-semibold text-gray-700">Успеваемость</span>
                                    <span className="ml-2 text-xs text-gray-500">(оценки 3,4,5)</span>
                                </div>
                                <span className="text-2xl font-bold text-blue-600">{calculatePassRate()}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min(calculatePassRate(), 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Матрица оценок */}
                    {filteredStudentSubjects.length > 0 ? (
                        <div className="overflow-x-auto bg-white rounded-lg shadow border">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[150px]">
                                            Предмет
                                        </th>
                                        {filteredStudentTasks.map(task => (
                                            <th key={`task-${task.id}`} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span>{new Date(task.task_created_at).toLocaleDateString('RU-ru')}</span>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10 min-w-[100px]">
                                            Средний балл
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredStudentSubjects.map((subject, index) => {
                                        const marksByTask = filteredStudentMarksMatrix.get(subject) || new Map();
                                        const averageScore = filteredAverageScores.get(subject) || 0;
                                        return (
                                            <tr key={`subject-${subject}-${index}`} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                                                    {subject}
                                                </td>
                                                {filteredStudentTasks.map(task => {
                                                    const taskData = marksByTask.get(task.id);
                                                    const mark = taskData?.mark;
                                                    let markClass = 'text-gray-400';
                                                    let markBgClass = '';
                                                    if (mark !== null && mark !== undefined && !isNaN(mark) && mark !== 0) {
                                                        if (mark >= 4) {
                                                            markClass = 'text-green-600 font-bold';
                                                            markBgClass = 'bg-green-50';
                                                        } else if (mark >= 3) {
                                                            markClass = 'text-blue-600';
                                                            markBgClass = 'bg-blue-50';
                                                        } else if (mark > 0) {
                                                            markClass = 'text-red-600';
                                                            markBgClass = 'bg-red-50';
                                                        }
                                                    }
                                                    return (
                                                        <td
                                                            key={`${subject}-${task.id}`}
                                                            className={`px-6 py-4 whitespace-nowrap text-sm text-center cursor-pointer transition-all ${markBgClass} hover:opacity-75`}
                                                            onClick={() => handleMarkClick(task.id, taskData?.answer_id, mark)}
                                                        >
                                                            <span className={markClass}>
                                                                {mark !== null && mark !== undefined && !isNaN(mark) && mark !== 0 ? mark : '—'}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold sticky right-0 bg-white z-10">
                                                    <span className={
                                                        averageScore >= 4 ? 'text-green-600' :
                                                            averageScore >= 3 ? 'text-blue-600' :
                                                                averageScore > 0 ? 'text-red-600' : 'text-gray-400'
                                                    }>
                                                        {averageScore > 0 ? averageScore.toFixed(2) : '0.00'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500 border rounded-lg bg-white">
                            Нет данных для отображения
                        </div>
                    )}

                    {/* Информация о количестве заданий */}
                    {filteredStudentTasks.length > 0 && (
                        <div className="mt-4 text-sm text-gray-500 text-right">
                            Всего заданий: {filteredStudentTasks.length}
                        </div>
                    )}
                </>
            ) : (
                // Для учителя и админа
                <>
                    <div className="mb-8 p-4 bg-white rounded-lg shadow-sm border">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <span className="text-sm font-semibold text-gray-700">Общая успеваемость</span>
                                <span className="ml-2 text-xs text-gray-500">(оценки 4 и 5)</span>
                            </div>
                            <span className="text-2xl font-bold text-green-600">
                                {(() => {
                                    if (!filteredSearchProps || filteredSearchProps.length === 0) return 0;
                                    let totalMarks = 0;
                                    let goodMarks = 0;
                                    filteredSearchProps.forEach((record: SearchRecord) => {
                                        const markColumn = record.columns.find(col => col.key === 'mark');
                                        const mark = markColumn?.data.value;
                                        if (mark && mark !== '' && !isNaN(Number(mark))) {
                                            totalMarks++;
                                            if (Number(mark) >= 4) goodMarks++;
                                        }
                                    });
                                    if (totalMarks === 0) return 0;
                                    return Number(((goodMarks / totalMarks) * 100).toFixed(2));
                                })()}%
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min((() => {
                                    if (!filteredSearchProps || filteredSearchProps.length === 0) return 0;
                                    let totalMarks = 0;
                                    let goodMarks = 0;
                                    filteredSearchProps.forEach((record: SearchRecord) => {
                                        const markColumn = record.columns.find(col => col.key === 'mark');
                                        const mark = markColumn?.data.value;
                                        if (mark && mark !== '' && !isNaN(Number(mark))) {
                                            totalMarks++;
                                            if (Number(mark) >= 4) goodMarks++;
                                        }
                                    });
                                    if (totalMarks === 0) return 0;
                                    return (goodMarks / totalMarks) * 100;
                                })(), 100)}%` }}
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">📋 Задание:</span>
                                <select
                                    className="px-4 py-2 border border-green-600 rounded-lg bg-white text-green-600"
                                    value={taskNum}
                                    onChange={handleTaskChange}
                                >
                                    {sidebarItems.map((item) => (
                                        <option key={`sidebar-${item.id}`} value={item.id}>
                                            {item.el}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {(user?.role == 'admin' || user?.role == 'teacher') && teacherGroups.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">👥 Группа:</span>
                                    <select
                                        className="px-4 py-2 border border-green-600 rounded-lg bg-white text-green-600"
                                        value={selectedGroupId}
                                        onChange={handleGroupChange}
                                    >
                                        {groupFilterOptions.map((option) => (
                                            <option key={`group-${option.value}`} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">⭐ Оценка:</span>
                                <select
                                    className="px-4 py-2 border border-green-600 rounded-lg bg-white text-green-600"
                                    value={selectedMark}
                                    onChange={handleMarkChange}
                                >
                                    {markFilterOptions.map((option) => (
                                        <option key={`mark-${option.value}`} value={option.value}>
                                            {option.label === 'Все оценки' ? option.label : `${option.label}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {(user?.role == 'admin' || user?.role == 'teacher') && (
                                <button
                                    onClick={() => setCompactModeEnabled(!compactModeEnabled)}
                                    className={`ml-auto px-4 py-2 rounded-lg transition-all ${compactModeEnabled
                                        ? 'bg-green-600 text-white'
                                        : 'bg-white text-green-600 border border-green-600'
                                        }`}
                                >
                                    {compactModeEnabled ? '📊 Обычный режим' : '📈 Компактный режим'}
                                </button>
                            )}
                        </div>
                    </div>

                    <SearchTable
                        searchProps={filteredSearchProps}
                        onRowClick={handleRowClick}
                        compactView={compactModeEnabled}
                        studentNameField="Ученик"
                        taskIdField="Задание"
                        gradeField="Оценка"
                        hideSearch={false}
                        hideFilters={true}
                    />
                </>
            )}
        </MainLayout>
    );
}