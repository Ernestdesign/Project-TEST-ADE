/**
 * CaloTrack - Vanilla JavaScript Calorie & Nutrition Tracker
 * Persistent browser storage using localStorage. No backend, no dependencies.
 */

(function () {
  'use strict';

  // Storage key in localStorage
  const STORAGE_KEY = 'calotrack_nutrition_data_v1';

  // Default initial state
  const DEFAULT_STATE = {
    settings: {
      dailyCalorieGoal: 2000,
      proteinGoal: 140,
      carbsGoal: 220,
      fatGoal: 65,
    },
    entries: [
      // Sample initial entries for first-time onboarding
      {
        id: 'sample-1',
        date: getTodayDateString(),
        meal: 'breakfast',
        name: 'Rolled Oats with Almond Milk & Berries',
        calories: 360,
        protein: 11,
        carbs: 64,
        fat: 7,
        time: '08:15',
      },
      {
        id: 'sample-2',
        date: getTodayDateString(),
        meal: 'lunch',
        name: 'Grilled Chicken Salad with Olive Oil',
        calories: 520,
        protein: 42,
        carbs: 18,
        fat: 26,
        time: '12:45',
      },
    ],
  };

  // State in memory
  let appState = loadState();
  let selectedDate = getTodayDateString();

  // DOM Elements
  const selectedDateInput = document.getElementById('selected-date');
  const prevDayBtn = document.getElementById('prev-day-btn');
  const nextDayBtn = document.getElementById('next-day-btn');
  const todayBtn = document.getElementById('today-btn');

  // Stats Elements
  const displayDateTitle = document.getElementById('display-date-title');
  const displayDateSub = document.getElementById('display-date-sub');
  const statusPill = document.getElementById('calorie-status-pill');
  const statGoal = document.getElementById('stat-goal');
  const statConsumed = document.getElementById('stat-consumed');
  const statRemaining = document.getElementById('stat-remaining');
  const remainingLabel = document.getElementById('remaining-label');
  const progressBarFill = document.getElementById('calorie-progress-bar');
  const progressPercentLabel = document.getElementById('progress-percent-label');
  const progressStatusLabel = document.getElementById('progress-status-label');

  // Macros
  const statProtein = document.getElementById('stat-protein');
  const statProteinCal = document.getElementById('stat-protein-cal');
  const statCarbs = document.getElementById('stat-carbs');
  const statCarbsCal = document.getElementById('stat-carbs-cal');
  const statFat = document.getElementById('stat-fat');
  const statFatCal = document.getElementById('stat-fat-cal');

  // Form Elements
  const foodForm = document.getElementById('food-entry-form');
  const editEntryIdInput = document.getElementById('edit-entry-id');
  const foodNameInput = document.getElementById('food-name');
  const foodCaloriesInput = document.getElementById('food-calories');
  const foodTimeInput = document.getElementById('food-time');
  const foodProteinInput = document.getElementById('food-protein');
  const foodCarbsInput = document.getElementById('food-carbs');
  const foodFatInput = document.getElementById('food-fat');
  const submitEntryBtn = document.getElementById('submit-entry-btn');
  const submitEntryText = document.getElementById('submit-entry-text');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');

  // Diary & List Elements
  const mealGroupsContainer = document.getElementById('meal-groups-container');
  const emptyStateNotice = document.getElementById('empty-state-notice');
  const clearDayBtn = document.getElementById('clear-day-btn');

  // Modals
  const confirmModal = document.getElementById('confirm-modal');
  const confirmTitle = document.getElementById('confirm-modal-title');
  const confirmMessage = document.getElementById('confirm-modal-message');
  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  const confirmAcceptBtn = document.getElementById('confirm-accept-btn');
  let confirmResolver = null;

  const goalModal = document.getElementById('goal-modal');
  const goalModalBtn = document.getElementById('goal-modal-btn');
  const goalModalClose = document.getElementById('goal-modal-close');
  const goalCancelBtn = document.getElementById('goal-cancel-btn');
  const goalForm = document.getElementById('goal-form');
  const inputDailyGoal = document.getElementById('input-daily-goal');
  const inputProteinGoal = document.getElementById('input-protein-goal');
  const inputCarbsGoal = document.getElementById('input-carbs-goal');
  const inputFatGoal = document.getElementById('input-fat-goal');

  // Reset & Import/Export
  const resetAllBtn = document.getElementById('reset-all-btn');
  const exportDataBtn = document.getElementById('export-data-btn');
  const importDataFile = document.getElementById('import-data-file');
  const toast = document.getElementById('toast');

  // =========================================================================
  // Initialization
  // =========================================================================
  function init() {
    selectedDateInput.value = selectedDate;
    setDefaultTimeInput();
    attachEventListeners();
    render();
  }

  // =========================================================================
  // State Persistence Helpers
  // =========================================================================
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.settings && Array.isArray(parsed.entries)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to parse stored CaloTrack data, using defaults.', err);
    }
    // Save initial sample state so storage is populated
    saveState(DEFAULT_STATE);
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }

  function saveState(stateToSave) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      showToast('Error saving data to browser storage', 'error');
      console.error(err);
    }
  }

  function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function setDefaultTimeInput() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    foodTimeInput.value = `${hours}:${minutes}`;
  }

  // =========================================================================
  // Confirmation Modal Engine
  // =========================================================================
  /**
   * Prompts the user with a confirmation dialog.
   * Returns a Promise resolving to true (confirmed) or false (cancelled).
   */
  function askConfirmation(options) {
    const {
      title = 'Are you sure?',
      message = 'This action cannot be undone.',
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      isDanger = true,
    } = options;

    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmAcceptBtn.textContent = confirmText;
    confirmCancelBtn.textContent = cancelText;

    if (isDanger) {
      confirmAcceptBtn.className = 'btn btn-danger';
    } else {
      confirmAcceptBtn.className = 'btn btn-primary';
    }

    confirmModal.classList.remove('hidden');

    return new Promise((resolve) => {
      confirmResolver = resolve;
    });
  }

  function closeConfirmModal(result) {
    confirmModal.classList.add('hidden');
    if (confirmResolver) {
      confirmResolver(result);
      confirmResolver = null;
    }
  }

  confirmCancelBtn.addEventListener('click', () => closeConfirmModal(false));
  confirmAcceptBtn.addEventListener('click', () => closeConfirmModal(true));

  // Dismiss on modal background click
  confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
      closeConfirmModal(false);
    }
  });

  // Handle Escape key to cancel modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!confirmModal.classList.contains('hidden')) {
        closeConfirmModal(false);
      }
      if (!goalModal.classList.contains('hidden')) {
        closeGoalModal();
      }
    }
  });

  // =========================================================================
  // Toast Notification
  // =========================================================================
  let toastTimer = null;
  function showToast(message, type = 'info') {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = 'toast';
    if (type === 'error') toast.classList.add('toast-error');
    if (type === 'success') toast.classList.add('toast-success');
    toast.classList.remove('hidden');

    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2800);
  }

  // =========================================================================
  // Date Navigation
  // =========================================================================
  function setDate(newDateString) {
    selectedDate = newDateString;
    selectedDateInput.value = selectedDate;
    resetForm();
    render();
  }

  function changeDayOffset(offset) {
    const parts = selectedDate.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    dateObj.setDate(dateObj.getDate() + offset);

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    setDate(`${year}-${month}-${day}`);
  }

  // =========================================================================
  // Render Function
  // =========================================================================
  function render() {
    renderDateHeaders();
    renderSummaryAndStats();
    renderFoodEntries();
  }

  function renderDateHeaders() {
    const today = getTodayDateString();
    const parts = selectedDate.split('-').map(Number);
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);

    const formattedDate = dateObj.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (selectedDate === today) {
      displayDateTitle.textContent = "Today's Summary";
      displayDateSub.textContent = formattedDate;
    } else {
      displayDateTitle.textContent = formattedDate;
      displayDateSub.textContent = 'Viewing past/future diary logs';
    }
  }

  function renderSummaryAndStats() {
    const dayEntries = appState.entries.filter((entry) => entry.date === selectedDate);
    const dailyGoal = appState.settings.dailyCalorieGoal || 2000;

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    dayEntries.forEach((item) => {
      totalCalories += Number(item.calories) || 0;
      totalProtein += Number(item.protein) || 0;
      totalCarbs += Number(item.carbs) || 0;
      totalFat += Number(item.fat) || 0;
    });

    const remaining = dailyGoal - totalCalories;
    const percentage = Math.min(Math.round((totalCalories / dailyGoal) * 100), 100);

    // Update Numerical Stats
    statGoal.textContent = dailyGoal.toLocaleString();
    statConsumed.textContent = totalCalories.toLocaleString();

    if (remaining >= 0) {
      remainingLabel.textContent = 'Remaining';
      statRemaining.textContent = remaining.toLocaleString();
      statRemaining.className = 'stat-value highlight-green';
    } else {
      remainingLabel.textContent = 'Over Goal';
      statRemaining.textContent = Math.abs(remaining).toLocaleString();
      statRemaining.className = 'stat-value highlight-red';
    }

    // Progress Bar & Status Pill
    progressBarFill.style.width = `${Math.min((totalCalories / dailyGoal) * 100, 100)}%`;

    if (totalCalories > dailyGoal) {
      progressBarFill.style.backgroundColor = '#ef4444';
      statusPill.textContent = 'Over Target';
      statusPill.className = 'status-pill status-over';
      progressPercentLabel.textContent = `${Math.round((totalCalories / dailyGoal) * 100)}% of daily target`;
      progressStatusLabel.textContent = `${Math.abs(remaining).toLocaleString()} kcal over`;
    } else if (remaining === 0) {
      progressBarFill.style.backgroundColor = '#10b981';
      statusPill.textContent = 'Target Met';
      statusPill.className = 'status-pill';
      progressPercentLabel.textContent = '100% of daily target';
      progressStatusLabel.textContent = 'Goal reached exactly';
    } else if (totalCalories >= dailyGoal * 0.9) {
      progressBarFill.style.backgroundColor = '#f59e0b';
      statusPill.textContent = 'Almost at Target';
      statusPill.className = 'status-pill status-warning';
      progressPercentLabel.textContent = `${percentage}% of daily target`;
      progressStatusLabel.textContent = `${remaining.toLocaleString()} kcal left`;
    } else {
      progressBarFill.style.backgroundColor = '#2563eb';
      statusPill.textContent = 'On Track';
      statusPill.className = 'status-pill';
      progressPercentLabel.textContent = `${percentage}% of daily target`;
      progressStatusLabel.textContent = `${remaining.toLocaleString()} kcal left`;
    }

    // Macronutrient values
    statProtein.textContent = `${Math.round(totalProtein * 10) / 10} g`;
    statProteinCal.textContent = `${Math.round(totalProtein * 4)} kcal`;

    statCarbs.textContent = `${Math.round(totalCarbs * 10) / 10} g`;
    statCarbsCal.textContent = `${Math.round(totalCarbs * 4)} kcal`;

    statFat.textContent = `${Math.round(totalFat * 10) / 10} g`;
    statFatCal.textContent = `${Math.round(totalFat * 9)} kcal`;
  }

  function renderFoodEntries() {
    const dayEntries = appState.entries.filter((entry) => entry.date === selectedDate);
    mealGroupsContainer.innerHTML = '';

    if (dayEntries.length === 0) {
      emptyStateNotice.classList.remove('hidden');
      return;
    }

    emptyStateNotice.classList.add('hidden');

    const mealCategories = [
      { key: 'breakfast', title: 'Breakfast', icon: '🌅' },
      { key: 'lunch', title: 'Lunch', icon: '☀️' },
      { key: 'dinner', title: 'Dinner', icon: '🌙' },
      { key: 'snacks', title: 'Snacks', icon: '🍎' },
    ];

    mealCategories.forEach((cat) => {
      const items = dayEntries.filter((e) => e.meal === cat.key);
      if (items.length === 0) return;

      const subtotalCals = items.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);

      const groupEl = document.createElement('div');
      groupEl.className = 'meal-group';

      let itemsHtml = '';
      items.forEach((item) => {
        let macrosHtml = '';
        if (item.protein > 0 || item.carbs > 0 || item.fat > 0) {
          macrosHtml = `
            <span class="macro-tag">P: ${item.protein || 0}g</span>
            <span class="macro-tag">C: ${item.carbs || 0}g</span>
            <span class="macro-tag">F: ${item.fat || 0}g</span>
          `;
        }

        const timeStr = item.time ? `<span class="item-time">${escapeHtml(item.time)}</span>` : '';

        itemsHtml += `
          <li class="meal-item" data-id="${item.id}">
            <div class="item-left">
              <div class="item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
              <div class="item-subtext">
                ${timeStr}
                ${macrosHtml}
              </div>
            </div>
            <div class="item-right">
              <span class="item-calories">${Number(item.calories).toLocaleString()} kcal</span>
              <div class="item-actions">
                <button type="button" class="item-action-btn edit-entry-btn" title="Edit entry" data-id="${item.id}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button type="button" class="item-action-btn delete-btn delete-entry-btn" title="Delete entry" data-id="${item.id}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
          </li>
        `;
      });

      groupEl.innerHTML = `
        <div class="meal-group-header">
          <div class="meal-group-title">
            <span>${cat.icon}</span>
            <span>${cat.title}</span>
          </div>
          <span class="meal-group-total">${subtotalCals.toLocaleString()} kcal</span>
        </div>
        <ul class="meal-items-list">
          ${itemsHtml}
        </ul>
      `;

      mealGroupsContainer.appendChild(groupEl);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // =========================================================================
  // Form Handling: Add & Edit Food Entry
  // =========================================================================
  function handleFormSubmit(e) {
    e.preventDefault();

    const editId = editEntryIdInput.value.trim();
    const mealTypeInput = document.querySelector('input[name="meal-type"]:checked');
    const meal = mealTypeInput ? mealTypeInput.value : 'breakfast';
    const name = foodNameInput.value.trim();
    const calories = Math.round(Number(foodCaloriesInput.value));
    const time = foodTimeInput.value || '';
    const protein = parseFloat(foodProteinInput.value) || 0;
    const carbs = parseFloat(foodCarbsInput.value) || 0;
    const fat = parseFloat(foodFatInput.value) || 0;

    if (!name) {
      showToast('Please enter a food name', 'error');
      foodNameInput.focus();
      return;
    }

    if (isNaN(calories) || calories <= 0) {
      showToast('Please enter valid calories greater than 0', 'error');
      foodCaloriesInput.focus();
      return;
    }

    if (editId) {
      // Update existing item
      const index = appState.entries.findIndex((i) => i.id === editId);
      if (index !== -1) {
        appState.entries[index] = {
          ...appState.entries[index],
          meal,
          name,
          calories,
          time,
          protein,
          carbs,
          fat,
        };
        saveState(appState);
        showToast('Food entry updated', 'success');
      }
    } else {
      // Add new item
      const newEntry = {
        id: 'entry-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        date: selectedDate,
        meal,
        name,
        calories,
        time,
        protein,
        carbs,
        fat,
      };
      appState.entries.push(newEntry);
      saveState(appState);
      showToast(`Added "${name}" (${calories} kcal)`, 'success');
    }

    resetForm();
    render();
  }

  function startEditEntry(id) {
    const item = appState.entries.find((i) => i.id === id);
    if (!item) return;

    editEntryIdInput.value = item.id;
    foodNameInput.value = item.name;
    foodCaloriesInput.value = item.calories;
    foodTimeInput.value = item.time || '';
    foodProteinInput.value = item.protein || '';
    foodCarbsInput.value = item.carbs || '';
    foodFatInput.value = item.fat || '';

    // Check correct radio button
    const radio = document.querySelector(`input[name="meal-type"][value="${item.meal}"]`);
    if (radio) radio.checked = true;

    // Toggle button texts
    submitEntryText.textContent = 'Update Entry';
    cancelEditBtn.classList.remove('hidden');

    // Scroll form into view
    foodForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    foodNameInput.focus();
  }

  function resetForm() {
    editEntryIdInput.value = '';
    foodNameInput.value = '';
    foodCaloriesInput.value = '';
    foodProteinInput.value = '';
    foodCarbsInput.value = '';
    foodFatInput.value = '';
    setDefaultTimeInput();
    submitEntryText.textContent = 'Add to Diary';
    cancelEditBtn.classList.add('hidden');
  }

  // =========================================================================
  // Deleting Entries with Mandatory Confirmation
  // =========================================================================
  async function handleDeleteEntry(id) {
    const item = appState.entries.find((i) => i.id === id);
    if (!item) return;

    // Ask for user confirmation via custom dialog
    const confirmed = await askConfirmation({
      title: 'Delete Food Entry',
      message: `Are you sure you want to remove "${item.name}" (${item.calories} kcal) from your log?`,
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      isDanger: true,
    });

    if (!confirmed) {
      return;
    }

    // Remove item and persist
    appState.entries = appState.entries.filter((i) => i.id !== id);
    saveState(appState);

    // If currently editing this item, reset form
    if (editEntryIdInput.value === id) {
      resetForm();
    }

    showToast(`Removed "${item.name}"`, 'info');
    render();
  }

  // =========================================================================
  // Clear Day's Log with Mandatory Confirmation
  // =========================================================================
  async function handleClearDay() {
    const dayEntries = appState.entries.filter((entry) => entry.date === selectedDate);
    if (dayEntries.length === 0) {
      showToast('No entries to clear for this date', 'info');
      return;
    }

    const confirmed = await askConfirmation({
      title: 'Clear Day Log',
      message: `Are you sure you want to delete all ${dayEntries.length} food items recorded for ${selectedDate}?`,
      confirmText: 'Yes, Clear All',
      cancelText: 'Cancel',
      isDanger: true,
    });

    if (!confirmed) {
      return;
    }

    appState.entries = appState.entries.filter((entry) => entry.date !== selectedDate);
    saveState(appState);
    resetForm();
    showToast(`Cleared all entries for ${selectedDate}`, 'info');
    render();
  }

  // =========================================================================
  // Quick Add Buttons
  // =========================================================================
  function handleQuickAdd(calories) {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const newEntry = {
      id: 'entry-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      date: selectedDate,
      meal: 'snacks',
      name: `Quick Snack (+${calories} kcal)`,
      calories: calories,
      time: time,
      protein: 0,
      carbs: 0,
      fat: 0,
    };

    appState.entries.push(newEntry);
    saveState(appState);
    showToast(`Added ${calories} kcal to Snacks`, 'success');
    render();
  }

  // =========================================================================
  // Goal Settings Modal
  // =========================================================================
  function openGoalModal() {
    inputDailyGoal.value = appState.settings.dailyCalorieGoal || 2000;
    inputProteinGoal.value = appState.settings.proteinGoal || 0;
    inputCarbsGoal.value = appState.settings.carbsGoal || 0;
    inputFatGoal.value = appState.settings.fatGoal || 0;
    goalModal.classList.remove('hidden');
    inputDailyGoal.focus();
  }

  function closeGoalModal() {
    goalModal.classList.add('hidden');
  }

  function handleSaveGoals(e) {
    e.preventDefault();
    const newDailyGoal = Math.round(Number(inputDailyGoal.value));
    const newProtein = Math.round(Number(inputProteinGoal.value)) || 0;
    const newCarbs = Math.round(Number(inputCarbsGoal.value)) || 0;
    const newFat = Math.round(Number(inputFatGoal.value)) || 0;

    if (isNaN(newDailyGoal) || newDailyGoal <= 0) {
      showToast('Daily calorie target must be greater than 0', 'error');
      return;
    }

    appState.settings = {
      dailyCalorieGoal: newDailyGoal,
      proteinGoal: newProtein,
      carbsGoal: newCarbs,
      fatGoal: newFat,
    };

    saveState(appState);
    closeGoalModal();
    showToast('Daily targets saved', 'success');
    render();
  }

  // =========================================================================
  // Reset All Data with Mandatory Confirmation
  // =========================================================================
  async function handleResetAll() {
    const confirmed = await askConfirmation({
      title: 'Reset All Data',
      message:
        'This will permanently delete all logged foods, dates, and customized target goals. All data stored in your browser will be erased. Proceed?',
      confirmText: 'Yes, Wipe Everything',
      cancelText: 'Cancel',
      isDanger: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
      appState = {
        settings: {
          dailyCalorieGoal: 2000,
          proteinGoal: 140,
          carbsGoal: 220,
          fatGoal: 65,
        },
        entries: [],
      };
      saveState(appState);
      resetForm();
      showToast('All data has been reset successfully', 'info');
      render();
    } catch (err) {
      showToast('Error resetting data', 'error');
      console.error(err);
    }
  }

  // =========================================================================
  // Export & Import Data
  // =========================================================================
  function handleExportData() {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(appState, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `calotrack-backup-${getTodayDateString()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Data exported successfully', 'success');
    } catch (err) {
      showToast('Failed to export data', 'error');
      console.error(err);
    }
  }

  function handleImportData(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (event) {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!importedData || !Array.isArray(importedData.entries)) {
          showToast('Invalid JSON file format for CaloTrack', 'error');
          return;
        }

        const confirmed = await askConfirmation({
          title: 'Import Calorie Data',
          message: `The selected file contains ${importedData.entries.length} food entries. Do you want to replace your current data with this backup?`,
          confirmText: 'Yes, Replace & Import',
          cancelText: 'Cancel',
          isDanger: false,
        });

        if (!confirmed) {
          importDataFile.value = '';
          return;
        }

        appState = {
          settings: {
            dailyCalorieGoal: importedData.settings?.dailyCalorieGoal || 2000,
            proteinGoal: importedData.settings?.proteinGoal || 0,
            carbsGoal: importedData.settings?.carbsGoal || 0,
            fatGoal: importedData.settings?.fatGoal || 0,
          },
          entries: importedData.entries,
        };

        saveState(appState);
        importDataFile.value = '';
        showToast(`Imported ${appState.entries.length} entries successfully`, 'success');
        render();
      } catch (err) {
        showToast('Failed to parse the backup file', 'error');
        console.error(err);
      }
    };

    reader.readAsText(file);
  }

  // =========================================================================
  // Event Delegation & Listeners
  // =========================================================================
  function attachEventListeners() {
    // Date Pickers & Navigation
    selectedDateInput.addEventListener('change', (e) => setDate(e.target.value));
    prevDayBtn.addEventListener('click', () => changeDayOffset(-1));
    nextDayBtn.addEventListener('click', () => changeDayOffset(1));
    todayBtn.addEventListener('click', () => setDate(getTodayDateString()));

    // Food Entry Form
    foodForm.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', resetForm);

    // Food Diary Event Delegation for Edit and Delete
    mealGroupsContainer.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.delete-entry-btn');
      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        handleDeleteEntry(id);
        return;
      }

      const editBtn = e.target.closest('.edit-entry-btn');
      if (editBtn) {
        const id = editBtn.getAttribute('data-id');
        startEditEntry(id);
        return;
      }
    });

    // Quick Add Buttons
    const quickAddBtns = document.querySelectorAll('.quick-add-btn');
    quickAddBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const cals = Number(btn.getAttribute('data-cals'));
        if (cals > 0) handleQuickAdd(cals);
      });
    });

    // Clear Day Button
    clearDayBtn.addEventListener('click', handleClearDay);

    // Goal Target Modal
    goalModalBtn.addEventListener('click', openGoalModal);
    goalModalClose.addEventListener('click', closeGoalModal);
    goalCancelBtn.addEventListener('click', closeGoalModal);
    goalForm.addEventListener('submit', handleSaveGoals);
    goalModal.addEventListener('click', (e) => {
      if (e.target === goalModal) closeGoalModal();
    });

    // Reset & Backup
    resetAllBtn.addEventListener('click', handleResetAll);
    exportDataBtn.addEventListener('click', handleExportData);
    importDataFile.addEventListener('change', handleImportData);
  }

  // Kickoff on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

