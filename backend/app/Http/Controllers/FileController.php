<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use PhpOffice\PhpWord\Element\TextRun;
use PhpOffice\PhpWord\Element\Title;
use PhpOffice\PhpWord\Element\ListItem;
use PhpOffice\PhpWord\Element\Table as WordTable;
use PhpOffice\PhpWord\Element\Image as WordImage;
use PhpOffice\PhpWord\Element\PageBreak;
use PhpOffice\PhpSpreadsheet\IOFactory;

use App\Models\File;
use App\Models\Log as ActionLog;

class FileController extends Controller
{
    private function logAction($action, $method, $userId, $ip, $details = null)
    {
        if (!$userId) {
            $userId = auth()->id();
        }
        
        return ActionLog::create([
            'action' => $action,
            'method' => $method,
            'user_id' => $userId,
            'ip' => $ip,
            'details' => $details ? json_encode($details, JSON_UNESCAPED_UNICODE) : null,
            'created_at' => now()
        ]);
    }

    public function saveFile(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:50000000|mimes:jpg,jpeg,png,gif,pdf,mp4,doc,docx,ppt,pptx,xls,xlsx,txt,zip',
            'author_id' => 'required|exists:users,id',
        ]);
        
        $uploadedFile = $request->file('file');
        
        $extension = strtolower($uploadedFile->getClientOriginalExtension());
        $mimeType = $uploadedFile->getMimeType();
        
        // Исправляем MIME тип для архивов
        if ($extension === 'zip' || $extension === 'rar') {
            $mimeType = 'application/zip';
        }
        
        // Исправляем для офисных файлов, если сервер неправильно определил
        $mimeMap = [
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc' => 'application/msword',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls' => 'application/vnd.ms-excel',
            'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'ppt' => 'application/vnd.ms-powerpoint',
            'pdf' => 'application/pdf',
            'txt' => 'text/plain',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'mp4' => 'video/mp4',
        ];
        
        if (isset($mimeMap[$extension]) && $mimeType !== $mimeMap[$extension]) {
            // Используем правильный MIME тип на основе расширения
            $mimeType = $mimeMap[$extension];
        }

        $path = $uploadedFile->store('uploads', 'public');

        $file = new File();
        $file->original_name = $uploadedFile->getClientOriginalName();
        $file->path = $path;
        $file->mime_type = $mimeType; // ✅ Правильный MIME тип
        $file->size = $uploadedFile->getSize();
        $file->author_id = $request->author_id;
        $file->save();
        
        $this->logAction(
            'Загрузка файла',
            'POST',
            $request->author_id,
            $request->ip(),
            [
                'file_id' => $file->id,
                'file_name' => $file->original_name,
                'file_size' => $file->size,
                'mime_type' => $file->mime_type
            ]
        );
        
        return response()->json([
            'success' => true,
            'message' => 'Файл успешно загружен',
            'file' => [
                'id' => $file->id,
                'original_name' => $file->original_name,
                'mime_type' => $file->mime_type,
                'size' => $file->size,
                'url' => Storage::url($path),
                'serve_url' => url('/api/files/serve/' . $file->id)
            ]
        ], 200, [], JSON_UNESCAPED_UNICODE);
    }

    public function show() 
    {
        $files = File::with('user')->orderBy('created_at', 'desc')->get();
        
        $files->transform(function ($file) {
            $file->url = Storage::url($file->path);
            $file->serve_url = url('/api/files/serve/' . $file->id);
            $file->file_type = $this->getFileType(pathinfo($file->original_name, PATHINFO_EXTENSION));
            return $file;
        });
        
        return response()->json([
            'success' => true,
            'data' => $files,
        ]);
    }

    public function fileInfo($id)
    {
        $file = File::with('user')->findOrFail($id);
        
        $file->url = Storage::url($file->path);
        $file->serve_url = url('/api/files/serve/' . $file->id);
        $file->file_type = $this->getFileType(pathinfo($file->original_name, PATHINFO_EXTENSION));
        
        return response()->json([
            'success' => true,
            'data' => $file,
        ]);
    }

    public function serveFile($id)
    {
        $file = File::findOrFail($id);
        
        $filePath = 'public/' . $file->path;
        
        if (!Storage::exists($filePath)) {
            return response()->json([
                'success' => false,
                'message' => 'Файл не найден в хранилище',
            ], 404);
        }

        $fullPath = storage_path('app/' . $filePath);
        
        return response()->file($fullPath, [
            'Content-Type' => $file->mime_type,
            'Content-Disposition' => 'inline; filename="' . $file->original_name . '"',
        ]);
    }

    public function loadFile($id, Request $request)
    {
        $file = File::findOrFail($id);
        
        $filePath = 'public/' . $file->path;
        
        if (!Storage::exists($filePath)) {
            return response()->json([
                'success' => false,
                'message' => 'Файл не найден в хранилище',
            ], 404);
        }

        $this->logAction(
            'Скачивание файла',
            'GET',
            auth()->id(),
            $request->ip(),
            [
                'file_id' => $file->id,
                'file_name' => $file->original_name
            ]
        );

        return Storage::download($filePath, $file->original_name, [
            'Content-Type' => $file->mime_type,
            'Content-Length' => $file->size,
        ]);
    }

    public function deleteFile($id, Request $request) 
    {
        $file = File::findOrFail($id);
        
        $fileData = [
            'file_id' => $file->id,
            'original_name' => $file->original_name,
            'size' => $file->size,
            'mime_type' => $file->mime_type,
            'author_id' => $file->author_id
        ];
        
        $filePath = 'public/' . $file->path;
        if (Storage::exists($filePath)) {
            Storage::delete($filePath);
        }
        
        $file->delete();
        
        $this->logAction(
            'Удаление файла',
            'DELETE',
            auth()->id(),
            $request->ip(),
            $fileData
        );

        return response()->json([
            'success' => true,
            'message' => 'Файл успешно удален'
        ]);
    }

    /**
     * Получение содержимого офисного файла для предпросмотра
     */
    public function getOfficeFileContent($id, Request $request)
    {
        $file = File::findOrFail($id);
        $extension = strtolower(pathinfo($file->original_name, PATHINFO_EXTENSION));
        
        $filePath = storage_path('app/public/' . $file->path);
        
        if (!file_exists($filePath)) {
            return response()->json([
                'success' => false,
                'message' => 'Файл не найден'
            ], 404);
        }
        
        try {
            $content = null;
            $type = '';
            
            if (in_array($extension, ['docx'])) {
                $content = $this->parseWordDocument($filePath);
                $type = 'word';
            }
            elseif (in_array($extension, ['doc'])) {
                $content = '<p class="text-yellow-800">⚠️ Файлы .doc не поддерживаются. Конвертируйте в .docx</p>';
                $type = 'word';
            }
            elseif (in_array($extension, ['xlsx', 'xls'])) {
                $content = $this->parseExcelDocument($filePath);
                $type = 'excel';
            }
            elseif (in_array($extension, ['pptx', 'ppt'])) {
                $content = $this->parsePowerPointDocument($filePath);
                $type = 'presentation';
            }
            else {
                return response()->json([
                    'success' => false,
                    'message' => 'Неподдерживаемый формат файла'
                ], 400);
            }
            
            $this->logAction(
                'Просмотр содержимого офисного файла',
                'GET',
                auth()->id(),
                $request->ip(),
                [
                    'file_id' => $file->id,
                    'file_name' => $file->original_name,
                    'file_type' => $type
                ]
            );
            
            return response()->json([
                'success' => true,
                'content' => $content,
                'type' => $type,
                'file_name' => $file->original_name
            ]);
            
        } catch (\Exception $e) {
            Log::error('Error parsing office file: ' . $e->getMessage());
            
            return response()->json([
                'success' => false,
                'message' => 'Ошибка при обработке файла'
            ], 500);
        }
    }

    /**
     * Парсинг Word документа в HTML
     */
    private function parseWordDocument($filePath)
    {
        try {
            $phpWord = WordIOFactory::load($filePath);
            $html = '<div class="word-document">';
            
            foreach ($phpWord->getSections() as $section) {
                foreach ($section->getElements() as $element) {
                    $html .= $this->parseWordElement($element);
                }
            }
            
            $html .= '</div>';
            
            if (empty(strip_tags($html))) {
                return '<p>Пустой документ</p>';
            }
            
            return $html;
            
        } catch (\Exception $e) {
            Log::error('Word parsing error: ' . $e->getMessage());
            return '<p>Ошибка чтения документа</p>';
        }
    }

    /**
     * Парсинг элемента Word
     */
    private function parseWordElement($element)
    {
        $html = '';
        
        // Заголовки
        if ($element instanceof Title) {
            $depth = method_exists($element, 'getDepth') ? $element->getDepth() : 1;
            $tag = 'h' . min($depth + 1, 6);
            $text = htmlspecialchars($element->getText());
            $html .= "<{$tag} style=\"font-weight: bold; margin: 10px 0; color: #1a1a1a;\">{$text}</{$tag}>";
        }
        // Текстовые блоки
        elseif ($element instanceof TextRun) {
            $html .= '<p style="margin: 5px 0; line-height: 1.6;">';
            foreach ($element->getElements() as $textElement) {
                if (method_exists($textElement, 'getText')) {
                    $text = htmlspecialchars($textElement->getText());
                    
                    $styles = [];
                    if (method_exists($textElement, 'getFontStyle')) {
                        $fontStyle = $textElement->getFontStyle();
                        if ($fontStyle) {
                            if ($fontStyle->isBold()) $styles[] = 'font-weight: bold';
                            if ($fontStyle->isItalic()) $styles[] = 'font-style: italic';
                            if ($fontStyle->getColor()) $styles[] = 'color: #' . $fontStyle->getColor();
                        }
                    }
                    
                    $styleAttr = !empty($styles) ? ' style="' . implode('; ', $styles) . '"' : '';
                    $html .= "<span{$styleAttr}>{$text}</span>";
                }
            }
            $html .= '</p>';
        }
        // Текст
        elseif (method_exists($element, 'getText')) {
            $text = htmlspecialchars($element->getText());
            if (!empty(trim($text))) {
                $html .= '<p style="margin: 5px 0;">' . $text . '</p>';
            }
        }
        // Списки
        elseif ($element instanceof ListItem) {
            $text = htmlspecialchars($element->getText());
            $html .= '<li style="margin: 5px 0 5px 20px;">' . $text . '</li>';
        }
        // Таблицы
        elseif ($element instanceof WordTable) {
            $html .= '<table style="border-collapse: collapse; width: 100%; margin: 10px 0;">';
            foreach ($element->getRows() as $row) {
                $html .= '<tr>';
                foreach ($row->getCells() as $cell) {
                    $html .= '<td style="border: 1px solid #ddd; padding: 8px;">';
                    foreach ($cell->getElements() as $cellElement) {
                        $html .= $this->parseWordElement($cellElement);
                    }
                    $html .= '</td>';
                }
                $html .= '</tr>';
            }
            $html .= '</table>';
        }
        // Изображения
        elseif ($element instanceof WordImage) {
            $imageData = base64_encode($element->getImageString());
            $html .= '<img src="data:image/' . $element->getImageExtension() . ';base64,' . $imageData . '" style="max-width: 100%; margin: 10px 0;" />';
        }
        // Разрывы страниц
        elseif ($element instanceof PageBreak) {
            $html .= '<hr style="border: none; border-top: 2px dashed #ccc; margin: 20px 0;" />';
        }
        
        return $html;
    }

    /**
     * Парсинг Excel в HTML таблицу
     */
    private function parseExcelDocument($filePath)
    {
        try {
            $spreadsheet = IOFactory::load($filePath);
            $html = '<div style="overflow-x: auto;">';
            
            foreach ($spreadsheet->getAllSheets() as $sheetIndex => $sheet) {
                if ($sheetIndex > 0) {
                    $html .= '<hr style="margin: 20px 0;">';
                }
                
                $html .= '<h3 style="margin-bottom: 10px; color: #1a73e8;">' . htmlspecialchars($sheet->getTitle()) . '</h3>';
                $html .= '<table style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">';
                
                foreach ($sheet->getRowIterator() as $rowIndex => $row) {
                    $html .= '<tr>';
                    $cellIterator = $row->getCellIterator();
                    $cellIterator->setIterateOnlyExistingCells(false);
                    
                    foreach ($cellIterator as $cell) {
                        $value = $cell->getFormattedValue() ?? $cell->getValue() ?? '';
                        $style = $rowIndex === 0 ? 'background: #f0f0f0; font-weight: bold;' : 'background: white;';
                        
                        // Проверяем стили ячейки
                        try {
                            $cellStyle = $cell->getStyle();
                            if ($cellStyle->getFont()->getBold()) {
                                $style .= ' font-weight: bold;';
                            }
                            $color = $cellStyle->getFont()->getColor();
                            if ($color && $color->getRGB()) {
                                $style .= ' color: #' . $color->getRGB() . ';';
                            }
                        } catch (\Exception $e) {}
                        
                        $html .= '<td style="border: 1px solid #ddd; padding: 8px 12px; ' . $style . '">' . htmlspecialchars($value) . '</td>';
                    }
                    $html .= '</tr>';
                }
                
                $html .= '</table>';
            }
            
            $html .= '</div>';
            
            return $html;
            
        } catch (\Exception $e) {
            Log::error('Excel parsing error: ' . $e->getMessage());
            return '<p>Ошибка чтения таблицы</p>';
        }
    }

    /**
     * Парсинг PowerPoint в HTML слайды
     */
    private function parsePowerPointDocument($filePath)
    {
        try {
            // Для PowerPoint используем ZipArchive напрямую
            $zip = new \ZipArchive();
            
            if ($zip->open($filePath) !== true) {
                return '<p>Не удалось открыть файл презентации</p>';
            }
            
            $slides = [];
            
            // Извлекаем текст из слайдов
            for ($i = 1; $i <= 100; $i++) {
                $slidePath = 'ppt/slides/slide' . $i . '.xml';
                $slideXml = $zip->getFromName($slidePath);
                
                if ($slideXml === false) break;
                
                $xml = simplexml_load_string($slideXml);
                $xml->registerXPathNamespace('a', 'http://schemas.openxmlformats.org/drawingml/2006/main');
                
                $texts = $xml->xpath('//a:t');
                $slideText = '';
                
                foreach ($texts as $text) {
                    $slideText .= (string)$text . ' ';
                }
                
                if (!empty(trim($slideText))) {
                    $slides[] = [
                        'number' => $i,
                        'content' => trim($slideText)
                    ];
                }
            }
            
            $zip->close();
            
            if (empty($slides)) {
                return '<p>Презентация пуста</p>';
            }
            
            // Создаем HTML для слайдов
            $html = '<div class="presentation-slides" style="font-family: Arial, sans-serif;">';
            
            foreach ($slides as $index => $slide) {
                $html .= sprintf(
                    '<div style="margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <h3 style="color: #1a73e8; margin-bottom: 15px;">Слайд %d</h3>
                        <div style="font-size: 16px; line-height: 1.8; white-space: pre-wrap;">%s</div>
                    </div>',
                    $slide['number'],
                    htmlspecialchars($slide['content'])
                );
            }
            
            $html .= '</div>';
            
            return $html;
            
        } catch (\Exception $e) {
            Log::error('PowerPoint parsing error: ' . $e->getMessage());
            return '<p>Ошибка чтения презентации</p>';
        }
    }

    private function getFileType($extension)
    {
        $types = [
            'txt' => 'text',
            'doc' => 'word',
            'docx' => 'word',
            'xls' => 'excel',
            'xlsx' => 'excel',
            'ppt' => 'powerpoint',
            'pptx' => 'powerpoint',
            'pdf' => 'pdf',
            'jpg' => 'image',
            'jpeg' => 'image',
            'png' => 'image',
            'gif' => 'image',
            'mp4' => 'video',
            'zip' => 'archive',
        ];
        
        return $types[strtolower($extension)] ?? 'unknown';
    }
}