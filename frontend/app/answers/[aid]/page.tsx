'use client'

import { api, AppUser, Files, Groups, Organization } from "@/api";
import MainLayout from "@/layouts/MainLayout";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import JSZip from 'jszip';

// Компонент слайдера
const FileSlider = ({ files, onClose }: { files: Array<{ name: string, url: string, type: string }>, onClose: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const currentFile = files[currentIndex];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % files.length);
    setIsZoomed(false);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + files.length) % files.length);
    setIsZoomed(false);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('text')) return '📃';
    return '📎';
  };

  const renderFileContent = () => {
    if (currentFile.type.startsWith('image/')) {
      return (
        <img
          src={currentFile.url}
          alt={currentFile.name}
          className={`max-w-full max-h-[80vh] object-contain transition-transform duration-300 ${isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'}`}
          onClick={() => setIsZoomed(!isZoomed)}
        />
      );
    } else if (currentFile.type === 'application/pdf') {
      return (
        <iframe
          src={currentFile.url}
          className="w-full h-[80vh] border-0 bg-white"
          title={currentFile.name}
        />
      );
    } else if (currentFile.type.startsWith('text/')) {
      return (
        <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-600 font-medium">{currentFile.name}</span>
            <span className="text-xs text-gray-500">Текстовый файл</span>
          </div>
          <iframe
            src={currentFile.url}
            className="w-full h-[70vh] bg-white"
            title={currentFile.name}
            style={{ border: 'none' }}
          />
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 bg-white rounded-lg shadow-xl max-w-2xl mx-auto">
          <div className="text-8xl mb-6">
            {getFileIcon(currentFile.type)}
          </div>
          <h3 className="text-2xl font-semibold mb-3 text-gray-900">
            {currentFile.name}
          </h3>
          <p className="text-gray-600 mb-6">
            Этот тип файла нельзя просмотреть в браузере
          </p>
          <a
            href={currentFile.url}
            download={currentFile.name}
            className="px-6 py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors"
          >
            Скачать файл
          </a>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white text-4xl z-10 hover:text-gray-300 transition-colors rounded-full w-12 h-12 flex items-center justify-center"
        >
          ✕
        </button>

        {/* Информация о файле */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg z-10">
          <div className="text-white text-sm">{currentIndex + 1} / {files.length}</div>
          <div className="text-white text-sm font-medium max-w-md truncate">{currentFile.name}</div>
        </div>

        {/* Контент файла */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          {renderFileContent()}
        </div>

        {/* Навигация */}
        {files.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl z-10 hover:text-gray-300 transition-colors rounded-full w-12 h-12 flex items-center justify-center"
            >
              {'<'}
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl z-10 hover:text-gray-300 transition-colors rounded-full w-12 h-12 flex items-center justify-center"
            >
              {'>'}
            </button>

            {/* Миниатюры */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 overflow-x-auto px-4 pb-2">
              {files.map((file, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    setIsZoomed(false);
                  }}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex 
                      ? 'border-main scale-110' 
                      : 'border-white/50 opacity-60 hover:opacity-100'
                  }`}
                >
                  {file.type.startsWith('image/') ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-700 text-white text-2xl">
                      {getFileIcon(file.type)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default function BookingPage() {
    const params = useParams();
    const router = useRouter();
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    const [users, setUsers] = useState<{ id: number, name: string }[]>([]);
    const [groups, setGroups] = useState<{ id: number, name: string }[]>([]);
    const [disabled, setDisabled] = useState(false)

    const [funcRole, setFuncRole] = useState('student');
    const [file, setFile] = useState<Files>();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [zipFiles, setZipFiles] = useState<Array<{ name: string, url: string, type: string }>>([]);
    const [showSlider, setShowSlider] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    useEffect(() => {
        getTaskInfo((params?.aid)?.toString() || '');
        loadUser();

        // Очистка URL объектов при размонтировании
        return () => {
            zipFiles.forEach(file => {
                if (file.url && file.url.startsWith('blob:')) {
                    URL.revokeObjectURL(file.url);
                }
            });
        };
    }, []);

    const loadUser = async () => {
        try {
            const userData = await api.getUser();
            setUser(userData);
        } catch (error) {
            console.error('Ошибка загрузки пользователя:', error);
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    const [task, setTask] = useState<{
        id: number,
        student: string,
        studentId: string,
        deadline: string,
        teacher_comment: string,
        students_comment: string,
        mark: string,
        fileId: number,
        fileUrl: string,
        fileType: string,
        fileName: string,
    }>();

    const [formData, setFormData] = useState<{
        task_id: number,
        answer_id: number,
        user_id: number,
        students_comment: string,
    }>({
        task_id: 0,
        answer_id: 0,
        user_id: 0,
        students_comment: '',
    })

    const extractZipFile = async (fileId: number) => {
        setIsExtracting(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8001/api/files/download/${fileId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки ZIP файла');
            }

            const blob = await response.blob();
            const zip = new JSZip();
            const zipContent = await zip.loadAsync(blob);
            
            const extractedFiles: Array<{ name: string, url: string, type: string }> = [];
            
            // Обрабатываем каждый файл в архиве
            for (const [path, file] of Object.entries(zipContent.files)) {
                if (!file.dir) {
                    const fileBlob = await file.async('blob');
                    const fileUrl = URL.createObjectURL(fileBlob);
                    const fileName = path.split('/').pop() || path;
                    
                    // Определяем MIME тип файла
                    const extension = fileName.split('.').pop()?.toLowerCase();
                    let mimeType = '';
                    
                    if (extension === 'pdf') mimeType = 'application/pdf';
                    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) mimeType = `image/${extension}`;
                    else if (extension === 'txt') mimeType = 'text/plain';
                    else if (extension === 'html') mimeType = 'text/html';
                    else if (extension === 'css') mimeType = 'text/css';
                    else if (extension === 'js') mimeType = 'application/javascript';
                    else mimeType = 'application/octet-stream';
                    
                    extractedFiles.push({
                        name: fileName,
                        url: fileUrl,
                        type: mimeType
                    });
                }
            }
            
            setZipFiles(extractedFiles);
            
            if (extractedFiles.length > 0) {
                setShowSlider(true);
            }
            
            const alertContent = (
                <div>
                    <div>✓ ZIP архив распакован!</div>
                    <div className="font-semibold my-1">Найдено файлов: {extractedFiles.length}</div>
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });
        } catch (error) {
            console.error('Ошибка распаковки ZIP:', error);
            const alertContent = (
                <div>
                    <div>❌ Ошибка распаковки ZIP:</div>
                    <div className="font-semibold my-1">Файл может быть поврежден или защищен паролем</div>
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });
        } finally {
            setIsExtracting(false);
        }
    };

    const getTaskInfo = async (id: string) => {
        try {
            const res = await api.getAnswers(id);

            console.log(res.data)

            const answerData = res.data;
            
            setTask({
                id: answerData.id,
                student: answerData.user.name,
                studentId: answerData.user.id,
                mark: answerData.mark,
                deadline: answerData.task.deadline,
                teacher_comment: answerData.teacher_comment,
                students_comment: answerData.students_comment,
                fileId: answerData.file?.id || 0,
                fileUrl: answerData.file?.path || '',
                fileType: answerData.file?.mime_type || '',
                fileName: answerData.file?.original_name || '',
            });

            // Если файл - ZIP архив, автоматически распаковываем
            if (answerData.file && (answerData.file.mime_type === 'application/zip' || answerData.file.original_name?.endsWith('.zip'))) {
                await extractZipFile(answerData.file.id);
            }
        } catch (error) {
            console.error('Ошибка загрузки ответа:', error);
            const alertContent = (
                <div>
                    <div>❌ Ошибка:</div>
                    <div className="font-semibold my-1">Не удалось загрузить информацию об ответе</div>
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });
        }
    }

    const [alertMess, setAlertMess] = useState<{ content: any }>();

    const setAnswer = async (event: FormEvent) => {
        event.preventDefault();
        let message

        const form: any = event.target

        const newData = {
            id: task?.id,
            mark: form.mark.value,
            teachers_comment: form.teachers_comment.value
        }

        console.log(newData)

        message = (await api.gradeTask(newData)).message

        const alertContent = (
            <div>
                <div>✓ Оценка выставлена!</div>
                <div className="font-semibold my-1">{message}</div>
                <div className="text-xs text-gray-500">
                    в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                </div>
            </div>
        );
        setAlertMess({ content: alertContent });
        
        // Обновляем информацию о задании
        getTaskInfo((params?.aid)?.toString() || '');
    }

    const getFileIcon = (mimeType: string) => {
        if (mimeType.includes('pdf')) return '📄';
        if (mimeType.includes('image')) return '🖼';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
        if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
        if (mimeType.includes('text') || mimeType.includes('plain')) return '📃';
        return '📎';
    };

    const getFileUrl = (filePath: string) => {
        return `http://localhost:8001/storage/${filePath}`;
    };

    const downloadFile = async (fileId: number, fileName: string) => {
        const newFileName = prompt(`Под каким именем сохранить? \n по умолчанию: (${fileName})`) || fileName;
        
        try {
            const response = await fetch(`http://localhost:8001/api/files/download/${fileId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки файла');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = newFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            const alertContent = (
                <div>
                    <div>✓ Файл успешно сохранен!</div>
                    <div className="font-semibold my-1">Файл сохранен под именем: {newFileName}</div>
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });
        } catch (error: any) {
            console.error('Error downloading file:', error);
            const alertContent = (
                <div>
                    <div>❌ Ошибка:</div>
                    <div className="font-semibold my-1">{error.message}</div>
                    <div className="text-xs text-gray-500">
                        в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
                    </div>
                </div>
            );
            setAlertMess({ content: alertContent });
        }
    };

    const handleViewArchive = () => {
        if (zipFiles.length > 0) {
            setShowSlider(true);
        } else if (task?.fileId) {
            extractZipFile(task.fileId);
        }
    };

    if (loading) {
        return (
            <div className="h-170 flex flex-col items-center justify-center">
                <div className="text-lg">Загрузка...</div>
            </div>
        );
    }

    if (!user || !task) {
        return null;
    }

    const isZipFile = task?.fileType === 'application/zip' || task?.fileName?.endsWith('.zip');

    return (
        <MainLayout alertMess={alertMess?.content}>
            {/* Слайдер для просмотра файлов из ZIP */}
            {showSlider && (
                <FileSlider 
                    files={zipFiles} 
                    onClose={() => {
                        setShowSlider(false);
                    }} 
                />
            )}

            <div className="h-full flex gap-10 items-center">
                <div className="w-3/4">
                    <h2 className="text-4xl mb-10">
                        Ответ от пользователя {task?.student}
                    </h2>

                    <div className="w-full h-130 mb-10 bg-white rounded-lg shadow-md overflow-hidden">
                        {isZipFile ? (
                            <div className="flex flex-col items-center justify-center h-130 text-center p-8">
                                <div className="text-8xl mb-6">📦</div>
                                <h3 className="text-2xl font-semibold mb-3">
                                    ZIP архив
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    {task?.fileName}
                                </p>
                                <p className="text-gray-600 mb-6">
                                    Этот архив содержит вложенные файлы
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleViewArchive}
                                        disabled={isExtracting}
                                        className="px-6 py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors disabled:opacity-50"
                                    >
                                        {isExtracting ? 'Распаковка...' : (zipFiles.length > 0 ? '📂 Просмотр архива' : '📦 Распаковать архив')}
                                    </button>
                                    <button
                                        onClick={() => downloadFile(task?.fileId || 0, task?.fileName || '')}
                                        className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                                    >
                                        📥 Скачать архив
                                    </button>
                                </div>
                                {zipFiles.length > 0 && (
                                    <div className="mt-4 text-sm text-gray-500">
                                        Найдено файлов: {zipFiles.length}
                                    </div>
                                )}
                            </div>
                        ) : task?.fileType?.startsWith('image/') ? (
                            <div className="flex items-center justify-center h-130 p-8 cursor-pointer" onClick={() => {
                                setZipFiles([{
                                    name: task.fileName,
                                    url: getFileUrl(task.fileUrl),
                                    type: task.fileType
                                }]);
                                setShowSlider(true);
                            }}>
                                <img
                                    src={getFileUrl(task?.fileUrl || '')}
                                    alt={task?.fileName}
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
                        ) : task?.fileType === 'application/pdf' ? (
                            <iframe
                                src={`${getFileUrl(task?.fileUrl || '')}`}
                                className="w-full h-130 border-0"
                                title={task?.fileName}
                            />
                        ) : task?.fileType?.startsWith('text/') ? (
                            <div className="w-full h-130 p-4">
                                <iframe
                                    src={`${getFileUrl(task?.fileUrl || '')}`}
                                    className="w-full h-full border rounded-lg"
                                    title={task?.fileName}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-130 text-center p-8">
                                <div className="text-8xl mb-4">
                                    {getFileIcon(task?.fileType?.toString() || '')}
                                </div>
                                <h3 className="text-2xl font-semibold mb-3">
                                    {task?.fileName}
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    На данный момент нельзя открывать файл этого типа на сайте
                                </p>
                                <button
                                    onClick={() => downloadFile(task?.fileId || 0, task?.fileName || '')}
                                    className="px-6 py-3 bg-main text-white rounded-lg hover:bg-main-dark transition-colors"
                                >
                                    📥 Скачать файл
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-1/4 p-5 flex flex-col justify-center gap-5 h-full overflow-y-auto bg-foreground rounded-lg border border-main">
                    <ul className="flex flex-col gap-5">
                        <li className="">Учащийся: <Link href={`users/${task?.studentId}`} className="text-main hover:text-main-dark">{task?.student}</Link></li>
                        <li className="">Срок сдачи: {task?.deadline}</li>
                        <li className="">Комментарий: {task?.students_comment || 'Нет комментария'}</li>
                        {task?.mark && task.mark !== 'н/а' && (
                            <li className="">Оценка: <span className="font-bold text-main">{task?.mark}</span></li>
                        )}
                    </ul>

                    <button
                        onClick={() => downloadFile(task?.fileId || 0, task?.fileName || '')}
                        className="px-4 py-2 bg-main text-white rounded-lg hover:bg-main-dark transition-colors"
                    >
                        📥 Скачать задание
                    </button>

                    {isZipFile && zipFiles.length > 0 && (
                        <button
                            onClick={handleViewArchive}
                            className="px-4 py-2 bg-main text-white rounded-lg hover:bg-main-dark transition-colors"
                        >
                            📂 Просмотреть архив ({zipFiles.length} файлов)
                        </button>
                    )}

                    <form className="w-full flex flex-col gap-5" onSubmit={setAnswer}>
                        <div className='bg-foreground col-span-1'>
                            <label htmlFor="teachers_comment" className='w-full text-main pl-7 text-[14px]'>
                                Комментарий (опционально)
                            </label>
                            <input
                                id="teachers_comment"
                                name="teachers_comment"
                                type="text"
                                placeholder="Комментарий"
                                className="w-full border-b-2 pb-2 border-main pl-2 focus:outline-none focus:border-main-dark"
                                defaultValue={task?.teacher_comment || ''}
                            />
                        </div>
                        <select 
                            name="mark" 
                            id="mark" 
                            className="w-full px-3 py-2 border border-main rounded-lg focus:outline-none focus:ring-2 focus:ring-main"
                            defaultValue={task?.mark || 'н/а'}
                        >
                            <option value="н/а">н/а</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                        </select>
                        <button
                            type="submit"
                            className="w-full py-2 bg-main text-white rounded-lg hover:bg-main-dark transition-colors"
                        >
                            Поставить оценку
                        </button>
                    </form>
                </div>
            </div>
        </MainLayout>
    )
}