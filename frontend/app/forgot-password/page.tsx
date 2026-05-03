'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Groups, Organization, RegistrationData } from '../../api';
import Alert from '@/components/alert/Alert';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegistrationData>({
    name: '',
    email: '',
    surname: '',
    tel: '',
    messanger: 'sms',
    target: 'forgot-password'
  });
  const [errors, setErrors] = useState<Partial<RegistrationData>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError('');

    const newData: typeof formData = {
      ...formData,
      messanger: ((document.querySelector('#messanger') as HTMLSelectElement).value),
      target: ((document.querySelector('#target') as HTMLInputElement).value),
    };

    const newErrors: Partial<RegistrationData> = {};

    let message

    if (!newData.email.includes('@') && !newData.email.includes('.') ) {
      newErrors.email = 'Некорректный email';
      message = ('Некорректный email')
    }

    const alertContent = (
      <div>
        <div>Сообщение:</div>
        <div className="font-semibold my-1">{message}</div>
        <div className="text-xs text-gray-500">
          в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
        </div>
      </div>
    );
    setAlertMess({ content: alertContent });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      const res = await api.register(newData);

      const alertContent = (
        <div>
          <div>Сообщение:</div>
          <div className="font-semibold my-1">Заявка успешно отправлена</div>
          <div className="text-xs text-gray-500">
            в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
          </div>
        </div>
      );
      setAlertMess({ content: alertContent });
      setTimeout(() => {
        router.push(`/success#${res.message}`);
        router.refresh();
      }, 3000);

    } catch (err: any) {
      const alertContent = (
        <div>
          <div>Ошибка:</div>
          <div className="font-semibold my-1">{err.message}</div>
          <div className="text-xs text-gray-500">
            в {new Date().toLocaleTimeString()}, {new Date().toLocaleDateString()}
          </div>
        </div>
      );
      setAlertMess({ content: alertContent });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    if (errors[name as keyof RegistrationData]) {
      setErrors({
        ...errors,
        [name]: undefined,
      });
    }
  };

  const [alertMess, setAlertMess] = useState<{ content: any }>();

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link href='/'>🏠 На главную</Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Отправить заявку на восстановление пароля
          </h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {serverError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {serverError}
            </div>
          )}

          <div className="flex flex-col gap-5">
            
            <div className='inputs'>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder=""
              />

              <label htmlFor="email">
                Адрес почты
              </label>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div className='inputs'>
              <input
                id="tel"
                name="tel"
                type="tel"
                autoComplete="new-tel"
                value={formData.tel}
                onChange={handleChange}
                placeholder=""
              />

              <label htmlFor="tel">
                Телефон (+79999999999)
              </label>
              {errors.tel && (
                <p className="mt-1 text-sm text-red-600">{errors.tel}</p>
              )}
            </div>

            <div className='flex flex-col bg-foreground'>

              <label htmlFor="messanger" className='w-full text-main pl-7 text-[14px]'>
                Способ связи
              </label>
              <select name="messanger" id="messanger" className='w-full border-b-2 pb-2 border-main pl-2'>
                <option value="sms">По смс</option>
                <option value="max">Через Max</option>
                <option value="t.me">Через Telegram</option>
                <option value="email">По почте</option>
              </select>
            </div>
            <input type="hidden" name="target" id='target' value='forgot-password' />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center px-8 py-2 border border-transparent text-base font-medium rounded-md text-white bg-main hover:bg-green-700 md:py-2 md:text-lg md:px-10"

            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Отправка...
                </>
              ) : 'Отправить Заявку'}
            </button>
          </div>

          <div className="text-sm text-center">
            <p>
              Отправляя заявку, вы соглашаетесь с <Link href="/docs/terms" className="font-medium text-main hover:text-main-hover">условиями использования
              </Link>
            </p>
          </div>
        </form>
      </div>
      <Alert alert={alertMess?.content} />
    </div>
  );
}