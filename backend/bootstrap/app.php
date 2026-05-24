<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\CheckBlocked;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Регистрация вашего мидлвара
        $middleware->alias([
            'check.blocked' => CheckBlocked::class
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Здесь теперь настраивается обработка исключений (вместо Handler.php)
    })
    ->create();