"use strict";
// Content Script for Copart Extension
// Tracks user actions and sends them to background script
console.log('Content script loaded and ready on Copart.');
// Функция для отправки сообщения в background script с повторными попытками
function sendActionToBackground(actionData, retries = 3) {
    chrome.runtime.sendMessage({
        type: 'BID_PLACED',
        data: actionData,
    }, (response) => {
        if (chrome.runtime.lastError) {
            // Ошибка отправки сообщения
            console.error('Error sending message to background:', chrome.runtime.lastError);
            if (retries > 0) {
                // Повторная попытка через 1 секунду
                setTimeout(() => sendActionToBackground(actionData, retries - 1), 1000);
            }
            else {
                // Все попытки исчерпаны - сохраняем действие в chrome.storage
                saveActionToChromeStorage(actionData);
            }
        }
        else if (response && response.status === 'queued') {
            console.log('Action queued successfully');
        }
    });
}
// Функция для сохранения действия в chrome.storage (более надежно, чем localStorage)
async function saveActionToChromeStorage(actionData) {
    try {
        // Получаем текущие действия из chrome.storage
        const result = await chrome.storage.local.get(['pendingActions']);
        const savedActions = result.pendingActions || [];
        // Добавляем новое действие
        savedActions.push(actionData);
        // Сохраняем обратно
        await chrome.storage.local.set({ pendingActions: savedActions });
        console.log('Action saved to chrome.storage. Total pending:', savedActions.length);
        // Пытаемся отправить сохраненные действия при следующей загрузке страницы
        window.addEventListener('load', trySendSavedActions);
    }
    catch (error) {
        console.error('Error saving action to chrome.storage:', error);
    }
}
// Функция для отправки сохраненных действий при загрузке страницы
async function trySendSavedActions() {
    try {
        const result = await chrome.storage.local.get(['pendingActions']);
        const savedActions = result.pendingActions || [];
        if (savedActions.length > 0) {
            console.log('Trying to send', savedActions.length, 'saved actions from chrome.storage');
            // Отправляем каждое действие
            savedActions.forEach((action) => {
                sendActionToBackground(action);
            });
            // Очищаем chrome.storage после отправки
            await chrome.storage.local.remove('pendingActions');
        }
    }
    catch (error) {
        console.error('Error processing saved actions:', error);
    }
}
// Инициализация - пытаемся отправить сохраненные действия при загрузке страницы
trySendSavedActions();
// Отслеживание действий на странице
document.addEventListener('click', function (event) {
    const target = event.target;
    // Отслеживание кликов по кнопкам ставок
    if (target.closest('.bid-button')) {
        const lotNumber = document.querySelector('.lot-number')?.textContent || 'unknown';
        const bidAmountElement = document.querySelector('.bid-amount');
        const bidAmount = bidAmountElement?.value || 'unknown';
        const actionData = {
            actionType: 'Bid',
            lotNumber: lotNumber,
            bidAmount: Number(bidAmount),
            timestamp: new Date().toISOString(),
            pageUrl: window.location.href,
        };
        sendActionToBackground(actionData);
    }
    // Отслеживание кликов по специфичным элементам (пример)
    if (target.matches('a[aria-controls="serverSideDataTable_mylots"][data-dt-idx="0"]')) {
        const actionData = {
            actionType: 'Bid',
            lotNumber: 'Unknown', // TODO: Extract actual lot number from page
            timestamp: new Date().toISOString(),
            pageUrl: window.location.href,
            commentary: 'Action triggered from table link',
        };
        console.log('Bid button clicked, data:', actionData);
        sendActionToBackground(actionData);
    }
});
// Отслеживание изменений URL (SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        const actionData = {
            actionType: 'View',
            timestamp: new Date().toISOString(),
            pageUrl: url,
        };
        sendActionToBackground(actionData);
    }
}).observe(document, { subtree: true, childList: true });
