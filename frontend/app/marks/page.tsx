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
    const [sidebarItems, setSidebarItems] = useState<{
        id: number,
        el: string,
    }[]>([{ id: 0, el: 'Все задания' }]);
    const [searchProps, setSearchProps] = useState<SearchRecord[]>([]);
    const [compactModeEnabled, setCompactModeEnabled] = useState(false);
    const [performanceData, setPerformanceData] = useState<any>(null);

    // Состояния для таблицы студента
    const [studentSubjects, setStudentSubjects] = useState<string[]>([]);
    const [studentTasks, setStudentTasks] = useState<{ id: number; title: string }[]>([]);
    const [studentMarksMatrix, setStudentMarksMatrix] = useState<Map<string, Map<number, TaskData>>>(new Map());
    const [averageScores, setAverageScores] = useState<Map<string, number>>(new Map());

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
            console.log('Ответ сервера:', res);

            const groupedUserIds = new Set<number>();
            const allGroupedStudents: any[] = [];

            res.groups?.forEach((group: any) => {
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

            // Собираем студентов без групп ИЗ ОТВЕТОВ
            const usersWithAnswersButNoGroup: any[] = [];
            const processedUserIds = new Set<number>();

            res.info?.forEach((task: any) => {
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

            const formattedData = {
                groups: res.groups || [],
                tasks: res.info || [],
                answers: res.info?.flatMap((task: any) => task.answers || []),
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

        // Проверяем, что пользователь - студент (не админ и не учитель)
        if (user?.role !== 'student') return;

        try {
            const res = await get(`get-performance-student/${user.id}`);
            console.log('Данные студента:', res);

            if (res?.data && Array.isArray(res.data)) {
                buildStudentTableView(res.data);
            } else if (res?.message === 'Студент не состоит в группе') {
                // Если студент не в группе, показываем пустое состояние
                setStudentSubjects([]);
                setStudentTasks([]);
                setStudentMarksMatrix(new Map());
                setAverageScores(new Map());
                setSearchProps([]);

                // Можно показать сообщение пользователю
                // Например, через toast или состояние
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

        // Собираем уникальные предметы
        const subjects = [...new Set(data.map(item => item.subject))];
        setStudentSubjects(subjects);

        // Собираем уникальные задания с их названиями
        const tasksMap = new Map<number, string>();
        data.forEach(item => {
            if (!tasksMap.has(item.task_id)) {
                tasksMap.set(item.task_id, item.task_title);
            }
        });

        const tasks = Array.from(tasksMap.entries()).map(([id, title]) => ({ id, title }));
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
                    if (value.mark !== null && value.mark !== undefined) {
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
                        add: item.mark !== null && item.mark >= 4 ? 'text-main font-bold' :
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
            console.error('Нет данных о заданиях');
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
                    _uniqueKey: `${task.id}_${student.id}_${answerId || 'no-answer'}`, // Уникальный ключ
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
                                add: mark !== '—' && Number(mark) >= 4 ? 'text-main font-bold' :
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
                        _uniqueKey: `${task.id}_${student.id}_${answer.id || 'no-answer'}_nogroup`, // Уникальный ключ
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
                                    add: answer.mark && Number(answer.mark) >= 4 ? 'text-main font-bold' :
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
            // Если есть ответ и оценка, переходим к ответу
            router.push(`/answers/${answerId}`);
        } else {
            // Если ответа нет, переходим к странице задания
            router.push(`/tasks/${taskId}`);
        }
    }, [router]);

    const groupFilterOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [
            { value: '', label: 'Все группы' }
        ];

        if (!performanceData?.groups) return options;

        performanceData.groups.forEach((group: any) => {
            if (group.id && group.name) {
                options.push({ value: group.id.toString(), label: group.name });
            }
        });

        if (accessLevel === 3) {
            const hasStudentsWithoutGroup = searchProps.some(record => {
                const groupColumn = record.columns.find(col => col.key === 'group');
                return groupColumn?.data.value === 'Без группы';
            });

            if (hasStudentsWithoutGroup) {
                options.push({ value: 'no-group', label: '📌 Без группы' });
            }
        }

        return options;
    }, [performanceData, accessLevel, searchProps]);

    const handleTaskChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setTaskNum(e.target.value);
    }, []);

    const handleGroupChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedGroupId(e.target.value);
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

        return filtered;
    }, [searchProps, selectedGroupId, taskNum, groupFilterOptions, accessLevel]);

    const donePercent = useMemo(() => {
        if (!filteredSearchProps || filteredSearchProps.length === 0) return 0;

        let totalMarks = 0;
        let goodMarks = 0;

        filteredSearchProps.forEach((record: SearchRecord) => {
            const markColumn = record.columns.find(col => col.key === 'mark');
            const mark = markColumn?.data.value;

            if (mark && mark !== '' && !isNaN(Number(mark))) {
                totalMarks++;
                if (Number(mark) >= 4) {
                    goodMarks++;
                }
            }
        });

        if (totalMarks === 0) return 0;

        const percent = (goodMarks / totalMarks) * 100;
        return Number(percent.toFixed(2));
    }, [filteredSearchProps]);

    const calculateSuccessRate = useCallback(() => {
        let totalMarks = 0;
        let goodMarks = 0;

        studentSubjects.forEach(subject => {
            const marksByTask = studentMarksMatrix.get(subject);
            if (marksByTask) {
                marksByTask.forEach((value) => {
                    if (value.mark !== null && value.mark !== undefined) {
                        totalMarks++;
                        if (value.mark >= 3) {
                            goodMarks++;
                        }
                    }
                });
            }
        });

        if (totalMarks === 0) return 0;
        return Number(((goodMarks / totalMarks) * 100).toFixed(2));
    }, [studentSubjects, studentMarksMatrix]);

    const calculateOverallAverage = useCallback(() => {
        let totalMarks = 0;
        let markCount = 0;

        studentSubjects.forEach(subject => {
            const marksByTask = studentMarksMatrix.get(subject);
            if (marksByTask) {
                marksByTask.forEach((value) => {
                    if (value.mark !== null && value.mark !== undefined) {
                        totalMarks += value.mark;
                        markCount++;
                    }
                });
            }
        });

        if (markCount === 0) return 0;
        return Number((totalMarks / markCount).toFixed(2));
    }, [studentSubjects, studentMarksMatrix]);

    if (authLoading || loading) {
        return (
            <Loader />
        );
    }

    if (!user) return null;

    return (
        <MainLayout>
            <div className="mb-8 mt-15">
                <h2 className="text-4xl font-bold mb-2">Журнал успеваемости</h2>
                <div className="flex items-center gap-2 text-gray-600">
                    <span>Уровень доступа —</span>
                    {accessLevel === 3 && <span className="text-green-600 font-semibold">Администратор</span>}
                    {accessLevel === 2 && <span className="text-blue-600 font-semibold">Учитель</span>}
                    {accessLevel === 1 && <span className="text-purple-600 font-semibold">Ученик</span>}
                </div>
            </div>

            {/* Для студента показываем матрицу оценок */}
            {accessLevel === 1 ? (
                <>
                    {/* Три блока с показателями */}
                    <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Качество знаний */}
                        <div className="p-4 bg-white rounded-lg shadow-sm border">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <span className="text-sm font-semibold text-gray-700">Качество выполнения</span>
                                </div>
                                <span className="text-2xl font-bold text-main">{donePercent}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-main h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${donePercent}%` }}
                                />
                            </div>
                        </div>

                        {/* Средний балл */}
                        <div className="p-4 bg-white rounded-lg shadow-sm border">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <span className="text-sm font-semibold text-gray-700">Средний балл</span>
                                </div>
                                <span className={`text-2xl font-bold ${calculateOverallAverage() >= 4 ? 'text-main' :
                                    calculateOverallAverage() >= 3 ? 'text-blue-600' : 'text-red-600'
                                    }`}>
                                    {calculateOverallAverage()}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all duration-300 ${calculateOverallAverage() >= 4 ? 'bg-main' :
                                        calculateOverallAverage() >= 3 ? 'bg-blue-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${(calculateOverallAverage() / 5) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Успеваемость (без двоек) */}
                        <div className="p-4 bg-white rounded-lg shadow-sm border">
                            <div className="flex justify-between items-center mb-3">
                                <div>
                                    <span className="text-sm font-semibold text-gray-700">Успеваемость</span>
                                </div>
                                <span className="text-2xl font-bold text-blue-600">{calculateSuccessRate()}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${calculateSuccessRate()}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Матрица оценок: предметы и задания */}
                    <div className="overflow-x-auto bg-white rounded-lg shadow border">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                                        Предмет
                                    </th>
                                    {studentTasks.map(task => (
                                        <th key={`task-${task.id}`} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                                            {task.title}
                                        </th>
                                    ))}
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10 min-w-[100px]">
                                        Средний балл
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {studentSubjects.map((subject, index) => {
                                    const marksByTask = studentMarksMatrix.get(subject) || new Map();
                                    const averageScore = averageScores.get(subject) || 0;
                                    return (
                                        <tr key={`subject-${subject}-${index}`} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                                                {subject}
                                            </td>
                                            {studentTasks.map(task => {
                                                const taskData = marksByTask.get(task.id);
                                                const mark = taskData?.mark;
                                                let markClass = 'text-gray-400';
                                                let markBgClass = '';
                                                if (mark !== null && mark !== undefined) {
                                                    if (mark >= 4) {
                                                        markClass = 'text-main font-bold';
                                                        markBgClass = 'bg-green-50';
                                                    } else if (mark < 4) {
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
                                                            {mark !== null && mark !== undefined ? mark : '—'}
                                                        </span>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold sticky right-0 bg-white z-10">
                                                <span className={
                                                    averageScore >= 4 ? 'text-main' :
                                                        averageScore >= 3 ? 'text-blue-600' :
                                                            averageScore > 0 ? 'text-red-600' : 'text-gray-400'
                                                }>
                                                    {averageScore > 0 ? averageScore : '0.00'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                // Для учителя и админа показываем старую таблицу
                <>
                    {/* Прогресс-бар успеваемости */}
                    <div className="mb-8 p-4 bg-white rounded-lg shadow-sm border">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <span className="text-sm font-semibold text-gray-700">Общая успеваемость</span>
                                <span className="ml-2 text-xs text-gray-500">(оценки 4 и 5)</span>
                            </div>
                            <span className="text-2xl font-bold text-main">{donePercent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-main h-3 rounded-full transition-all duration-300"
                                style={{ width: `${donePercent}%` }}
                            />
                        </div>
                    </div>

                    {/* Фильтры */}
                    <div className="mb-6">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-700">📋 Задание:</span>
                                <select
                                    className="px-4 py-2 border border-main rounded-lg bg-white text-main"
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

                            {(user?.role == 'admin' || user?.role == 'teacher') && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-700">👥 Группа:</span>
                                    <select
                                        className="px-4 py-2 border border-main rounded-lg bg-white text-main"
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

                            {(user?.role == 'admin' || user?.role == 'teacher') && (
                                <button
                                    onClick={() => setCompactModeEnabled(!compactModeEnabled)}
                                    className={`ml-auto px-4 py-2 rounded-lg transition-all ${compactModeEnabled
                                        ? 'bg-main text-white'
                                        : 'bg-white text-main border border-main'
                                        }`}
                                >
                                    {compactModeEnabled ? '📊 Обычный режим' : '📈 Компактный режим'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Таблица */}
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