const state = {
  clients: [],
  status: null,
  selectedConfig: '',
  selectedClient: null,
  selectedAppLink: '',
  settings: null,
  monitor: null,
  trafficSummary: null,
  selectedDevicesClient: null,
  clientSearch: '',
  clientStatusFilter: 'all',
  clientPagination: {
    page: 1,
    limit: Number(localStorage.getItem('jamanwg.clients.limit') || 50),
    total: 0,
    filtered: 0,
    totalPages: 1
  },
  endpoints: [],
  balancer: null,
  portProfiles: [],
  events: [],
  eventsPagination: {
    page: 1,
    limit: Number(localStorage.getItem('jamanwg.events.limit') || 50),
    total: 0,
    totalPages: 1
  },
  page: 'clients',
  language: localStorage.getItem('jamanwg.language') || 'ru'
};

const el = {
  loginView: document.querySelector('#loginView'),
  appView: document.querySelector('#appView'),
  pageTitle: document.querySelector('#pageTitle'),
  pageTabs: document.querySelectorAll('.page-tab'),
  pageViews: document.querySelectorAll('.page-view'),
  loginLanguageSelect: document.querySelector('#loginLanguageSelect'),
  appLanguageSelect: document.querySelector('#appLanguageSelect'),
  loginForm: document.querySelector('#loginForm'),
  loginError: document.querySelector('#loginError'),
  clientForm: document.querySelector('#clientForm'),
  formError: document.querySelector('#formError'),
  clientsBody: document.querySelector('#clientsBody'),
  emptyState: document.querySelector('#emptyState'),
  clientSearchInput: document.querySelector('#clientSearchInput'),
  clientStatusFilter: document.querySelector('#clientStatusFilter'),
  clientPageSizeSelect: document.querySelector('#clientPageSizeSelect'),
  clearClientFilterButton: document.querySelector('#clearClientFilterButton'),
  clientCountLabel: document.querySelector('#clientCountLabel'),
  clientPagination: document.querySelector('#clientPagination'),
  clientPrevPageButton: document.querySelector('#clientPrevPageButton'),
  clientNextPageButton: document.querySelector('#clientNextPageButton'),
  clientPageLabel: document.querySelector('#clientPageLabel'),
  eventsList: document.querySelector('#eventsList'),
  eventsCountLabel: document.querySelector('#eventsCountLabel'),
  eventsPagination: document.querySelector('#eventsPagination'),
  eventsPageSizeSelect: document.querySelector('#eventsPageSizeSelect'),
  eventsPrevPageButton: document.querySelector('#eventsPrevPageButton'),
  eventsNextPageButton: document.querySelector('#eventsNextPageButton'),
  eventsPageLabel: document.querySelector('#eventsPageLabel'),
  modeMetric: document.querySelector('#modeMetric'),
  ifaceMetric: document.querySelector('#ifaceMetric'),
  endpointMetric: document.querySelector('#endpointMetric'),
  clientsMetric: document.querySelector('#clientsMetric'),
  onlineMetric: document.querySelector('#onlineMetric'),
  addressPoolMetric: document.querySelector('#addressPoolMetric'),
  monitorGrid: document.querySelector('#monitorGrid'),
  trafficPeriodSelect: document.querySelector('#trafficPeriodSelect'),
  trafficRefreshButton: document.querySelector('#trafficRefreshButton'),
  trafficHistoryList: document.querySelector('#trafficHistoryList'),
  trafficTopClients: document.querySelector('#trafficTopClients'),
  endpointCards: document.querySelector('#endpointCards'),
  endpointForm: document.querySelector('#endpointForm'),
  endpointError: document.querySelector('#endpointError'),
  checkEndpointsButton: document.querySelector('#checkEndpointsButton'),
  balancerStrategyMetric: document.querySelector('#balancerStrategyMetric'),
  balancerNodesMetric: document.querySelector('#balancerNodesMetric'),
  balancerLocalClientsMetric: document.querySelector('#balancerLocalClientsMetric'),
  balancerBestNodeMetric: document.querySelector('#balancerBestNodeMetric'),
  balancerNodeCards: document.querySelector('#balancerNodeCards'),
  balancerNodeForm: document.querySelector('#balancerNodeForm'),
  balancerError: document.querySelector('#balancerError'),
  checkBalancerButton: document.querySelector('#checkBalancerButton'),
  refreshButton: document.querySelector('#refreshButton'),
  eventsRefreshButton: document.querySelector('#eventsRefreshButton'),
  syncButton: document.querySelector('#syncButton'),
  settingsPanel: document.querySelector('#settingsPanel'),
  settingsForm: document.querySelector('#settingsForm'),
  settingsError: document.querySelector('#settingsError'),
  apiTokenOutput: document.querySelector('#apiTokenOutput'),
  copyApiTokenButton: document.querySelector('#copyApiTokenButton'),
  regenerateApiTokenButton: document.querySelector('#regenerateApiTokenButton'),
  copyHayVonPanelButton: document.querySelector('#copyHayVonPanelButton'),
  openHayVonPanelButton: document.querySelector('#openHayVonPanelButton'),
  restartButton: document.querySelector('#restartButton'),
  logoutButton: document.querySelector('#logoutButton'),
  themeButton: document.querySelector('#themeButton'),
  dialog: document.querySelector('#configDialog'),
  dialogTitle: document.querySelector('#dialogTitle'),
  configOutput: document.querySelector('#configOutput'),
  qrImage: document.querySelector('#qrImage'),
  qrHint: document.querySelector('#qrHint'),
  closeDialogButton: document.querySelector('#closeDialogButton'),
  openAppButton: document.querySelector('#openAppButton'),
  copyLinkButton: document.querySelector('#copyLinkButton'),
  copyBundleButton: document.querySelector('#copyBundleButton'),
  copyConfigButton: document.querySelector('#copyConfigButton'),
  downloadConfigLink: document.querySelector('#downloadConfigLink'),
  devicesDialog: document.querySelector('#devicesDialog'),
  devicesDialogTitle: document.querySelector('#devicesDialogTitle'),
  devicesList: document.querySelector('#devicesList'),
  closeDevicesDialogButton: document.querySelector('#closeDevicesDialogButton'),
  toast: document.querySelector('#toast')
};

const languageMeta = {
  ru: { locale: 'ru-RU', dir: 'ltr' },
  en: { locale: 'en-US', dir: 'ltr' },
  fa: { locale: 'fa-IR', dir: 'rtl' },
  zh: { locale: 'zh-CN', dir: 'ltr' }
};

const translations = {
  ru: {
    'common.language': 'Язык',
    'login.title': 'Панель AmneziaWG',
    'login.username': 'Логин',
    'login.password': 'Пароль',
    'login.sign_in': 'Войти',
    'nav.clients': 'Клиенты',
    'nav.endpoints': 'Endpoints',
    'nav.balancer': 'Балансировка',
    'nav.events': 'Журнал',
    'nav.settings': 'Настройки',
    'actions.sync': 'Синхронизировать',
    'actions.server_config': 'Серверный конфиг',
    'actions.logout': 'Выйти',
    'actions.reset': 'Сброс',
    'actions.refresh': 'Обновить',
    'actions.copy': 'Скопировать',
    'actions.close': 'Закрыть',
    'actions.delete': 'Удалить',
    'actions.enable': 'Включить',
    'actions.disable': 'Отключить',
    'actions.check': 'Проверить',
    'pagination.prev': 'Назад',
    'pagination.next': 'Вперед',
    'pagination.page': 'Страница {page} из {totalPages}',
    'status.mode': 'Режим',
    'status.interface': 'Интерфейс',
    'status.clients': 'Клиенты',
    'status.online': 'Онлайн',
    'status.address_pool': 'Слоты IP',
    'monitor.title': 'Отчет сервера',
    'monitor.subtitle': 'Нагрузка, память, диск и общий трафик AmneziaWG.',
    'monitor.cpu': 'CPU',
    'monitor.memory': 'Память',
    'monitor.disk': 'Диск',
    'monitor.uptime': 'Uptime',
    'monitor.total_traffic': 'Всего трафика',
    'monitor.online_clients': 'Онлайн',
    'monitor.rx': 'получено',
    'monitor.tx': 'отправлено',
    'monitor.free': 'свободно',
    'monitor.panel_memory': 'панель',
    'monitor.speed': 'скорость',
    'traffic.title': 'Аналитика трафика',
    'traffic.subtitle': 'История расхода и топ клиентов по трафику.',
    'traffic.daily': 'По дням',
    'traffic.monthly': 'По месяцам',
    'traffic.history': 'История',
    'traffic.top_clients': 'Топ клиентов',
    'traffic.empty': 'Данных пока нет.',
    'traffic.period_total': 'за период',
    'clients.new_client': 'Новый клиент',
    'clients.name': 'Имя',
    'clients.name_placeholder': 'iPhone клиента',
    'clients.email': 'Email или ID',
    'clients.days': 'Дней',
    'clients.traffic_limit': 'Лимит, GB',
    'clients.hwid_limit': 'HWID лимит устройств',
    'clients.create': 'Создать клиента',
    'clients.list': 'Список клиентов',
    'clients.search_placeholder': 'Поиск: имя, email, id, ключ, IP',
    'clients.page_size': 'На странице',
    'clients.shown_all': 'Показано {from}-{to} из {total}',
    'clients.shown_filtered': 'Показано {from}-{to} из {filtered}, всего {total}',
    'clients.shown_empty': 'Ничего не найдено',
    'clients.empty': 'Клиенты пока не созданы.',
    'clients.empty_filter': 'По этому фильтру клиентов нет.',
    'clients.open_app': 'В HayVon',
    'clients.config': 'Конфиг',
    'clients.devices': 'HWID',
    'clients.reissue': 'Перевыпуск',
    'clients.online': 'Онлайн',
    'clients.active': 'Активен',
    'clients.disabled': 'Отключен',
    'clients.unlimited': 'без лимита',
    'filters.all': 'Все',
    'filters.enabled': 'Активные',
    'filters.disabled': 'Отключенные',
    'filters.online': 'С handshake',
    'table.client': 'Клиент',
    'table.address': 'Адрес',
    'table.status': 'Статус',
    'table.traffic': 'Трафик',
    'endpoints.title': 'Endpoints и обход блокировок',
    'endpoints.subtitle': 'Один ключ можно отдавать через несколько UDP endpoints: 443, 8443 или свой порт.',
    'endpoints.check_all': 'Проверить endpoints',
    'endpoints.label': 'Название',
    'endpoints.priority': 'Приоритет',
    'endpoints.enabled_in_bundles': 'Включить в набор endpoints',
    'endpoints.add': 'Добавить endpoint',
    'endpoints.empty': 'Endpoints пока не созданы.',
    'endpoints.not_checked': 'не проверен',
    'endpoints.in_bundles': 'в наборе',
    'endpoints.off': 'выключен',
    'balancer.title': 'Балансировка серверов',
    'balancer.subtitle': 'Добавьте другие панели jamanWG как узлы. Сайт может вызывать /api/v1/balancer/allocate, и панель выберет менее загруженный сервер.',
    'balancer.strategy': 'Стратегия',
    'balancer.nodes': 'Узлы',
    'balancer.local_clients': 'Локальные клиенты',
    'balancer.best_node': 'Лучший узел',
    'balancer.check_all': 'Проверить узлы',
    'balancer.node_name': 'Название',
    'balancer.api_url': 'API URL',
    'balancer.api_token': 'API token',
    'balancer.group': 'Группа',
    'balancer.weight': 'Вес',
    'balancer.max_clients': 'Макс. клиентов',
    'balancer.max_traffic': 'Макс. трафик, GB',
    'balancer.add_node': 'Добавить узел',
    'balancer.empty': 'Узлы балансировки пока не добавлены.',
    'balancer.local_node': 'Локальный сервер',
    'balancer.load': 'нагрузка',
    'balancer.capacity': 'лимит',
    'balancer.status_unknown': 'не проверен',
    'toast.balancer_node_added': 'Узел добавлен',
    'toast.balancer_node_checked': 'Узел проверен',
    'toast.balancer_nodes_checked': 'Узлы проверены',
    'toast.balancer_node_enabled': 'Узел включен',
    'toast.balancer_node_disabled': 'Узел выключен',
    'toast.balancer_node_deleted': 'Узел удален',
    'confirm.delete_balancer_node': 'Удалить узел "{name}"?',
    'events.title': 'Журнал',
    'events.subtitle': 'Последние события панели, клиентов, узлов и HWID.',
    'events.shown': 'Показано {from}-{to} из {total}',
    'events.empty': 'Журнал пуст.',
    'events.client_id': 'Клиент',
    'events.action.client.created': 'Клиент создан',
    'events.action.client.updated': 'Клиент обновлен',
    'events.action.client.deleted': 'Клиент удален',
    'events.action.client.reissued': 'Ключи перевыпущены',
    'events.action.client.auto_disabled': 'Клиент отключен автоматически',
    'events.action.device.bound': 'HWID привязан',
    'events.action.device.revoked': 'HWID отозван',
    'events.action.endpoint.created': 'Endpoint создан',
    'events.action.endpoint.updated': 'Endpoint обновлен',
    'events.action.endpoint.deleted': 'Endpoint удален',
    'events.action.balancer.node.created': 'Узел добавлен',
    'events.action.balancer.node.updated': 'Узел обновлен',
    'events.action.balancer.node.deleted': 'Узел удален',
    'events.action.balancer.assignment.created': 'Клиент назначен на узел',
    'events.action.balancer.assignment.deleted': 'Назначение удалено',
    'events.action.settings.username': 'Логин администратора изменен',
    'events.action.settings.password': 'Пароль администратора изменен',
    'events.action.settings.api_token': 'API token изменен',
    'events.action.panel.restart': 'Запрошен перезапуск панели',
    'events.action.sync.warning': 'Предупреждение синхронизации',
    'events.action.peer.remove.warning': 'Предупреждение удаления peer',
    'events.message.client_created': 'Создан клиент {name}.',
    'events.message.client_updated': 'Обновлен клиент {name}.',
    'events.message.client_deleted': 'Удален клиент {name}.',
    'events.message.client_reissued': 'Ключи клиента {name} перевыпущены.',
    'events.message.client_auto_disabled': 'Клиент {name} отключен автоматически: {reason}.',
    'events.message.endpoint_created': 'Создан endpoint {name} ({endpoint}).',
    'events.message.endpoint_updated': 'Обновлен endpoint {name}.',
    'events.message.endpoint_deleted': 'Удален endpoint {name}.',
    'events.message.node_created': 'Добавлен узел {name}.',
    'events.message.node_updated': 'Обновлен узел {name}.',
    'events.message.node_deleted': 'Удален узел {name}.',
    'events.message.hwid_bound': 'Привязан HWID {hwid}.',
    'events.message.hwid_revoked': 'Отозван HWID {hwid}.',
    'events.message.username_changed': 'Логин администратора изменен: {from} -> {to}.',
    'events.message.password_changed': 'Пароль администратора изменен.',
    'events.message.api_token_changed': 'API token изменен.',
    'events.message.api_token_regenerated': 'API token перегенерирован.',
    'events.message.restart_requested': 'Администратор запросил перезапуск панели.',
    'settings.title': 'Настройки панели',
    'settings.subtitle': 'Логин, пароль, API-токен для внешних интеграций и сервисные действия.',
    'settings.restart': 'Перезапустить панель',
    'settings.api_token': 'API token для внешних интеграций',
    'settings.regenerate': 'Перегенерировать',
    'settings.compat_app': 'Совместимое приложение',
    'settings.compat_desc': 'HayVon может подключаться к jamanWG по URL панели и API token, чтобы загрузить созданные клиентские конфигурации.',
    'settings.hayvon_copy': 'Скопировать подключение',
    'settings.hayvon_open': 'Открыть HayVon',
    'settings.admin_login': 'Логин администратора',
    'settings.current_password': 'Текущий пароль',
    'settings.current_password_placeholder': 'Нужен для смены логина/пароля',
    'settings.new_password': 'Новый пароль',
    'settings.new_password_placeholder': 'Минимум 10 символов',
    'settings.save': 'Сохранить настройки',
    'settings.restart_available': 'Перезапустить systemd-сервис jamanWG',
    'settings.restart_unavailable': 'На этом сервере не настроена команда перезапуска',
    'dialog.client_config': 'Client config',
    'dialog.config': 'Конфиг',
    'dialog.open_app': 'Открыть в HayVon',
    'dialog.copy_link': 'Скопировать ссылку',
    'dialog.copy_bundle': 'Скопировать все endpoints',
    'dialog.copy_conf': 'Скопировать .conf',
    'dialog.download_conf': 'Скачать .conf',
    'dialog.qr_available': 'QR доступен, если на сервере установлен qrencode.',
    'dialog.qr_unavailable': 'QR недоступен: qrencode не установлен на сервере.',
    'dialog.qr_error': 'qrencode не установлен или конфиг слишком большой для QR.',
    'devices.title': 'Устройства',
    'devices.empty': 'HWID пока не привязан. Устройство появится после авторизации из приложения.',
    'devices.unnamed': 'Без названия',
    'devices.revoked': 'Отозвано',
    'devices.revoke': 'Отозвать',
    'theme.light': 'Светлая тема',
    'theme.dark': 'Темная тема',
    'toast.link_to_app': 'Ссылка скопирована и отправлена в HayVon',
    'toast.endpoint_added': 'Endpoint добавлен',
    'toast.endpoint_ok': 'Endpoint доступен',
    'toast.endpoint_warning': 'Проверка завершена с предупреждением',
    'toast.endpoint_disabled': 'Endpoint выключен',
    'toast.endpoint_enabled': 'Endpoint включен',
    'toast.endpoint_deleted': 'Endpoint удален',
    'toast.endpoints_checked': 'Endpoints проверены',
    'toast.client_created': 'Клиент создан',
    'toast.client_disabled': 'Клиент отключен',
    'toast.client_enabled': 'Клиент включен',
    'toast.client_deleted': 'Клиент удален',
    'toast.keys_reissued': 'Ключи перевыпущены',
    'toast.settings_saved': 'Настройки сохранены',
    'toast.api_copied': 'API token скопирован',
    'toast.api_updated': 'API token обновлен',
    'toast.hayvon_panel_copied': 'Подключение HayVon скопировано',
    'toast.hayvon_panel_opening': 'Открываем HayVon',
    'toast.restart_started': 'Перезапуск запущен',
    'toast.data_refreshed': 'Данные обновлены',
    'toast.synced': 'Интерфейс синхронизирован',
    'toast.hwid_revoked': 'HWID отозван',
    'toast.config_copied': 'Конфиг скопирован',
    'toast.link_copied': 'Ссылка для HayVon скопирована',
    'toast.bundle_copied': 'Набор endpoints скопирован',
    'toast.opening_app': 'Открываю HayVon',
    'confirm.reissue': 'Перевыпустить ключи для "{name}"? Старый конфиг перестанет работать после синхронизации.',
    'confirm.delete_client': 'Удалить клиента "{name}"?',
    'confirm.delete_endpoint': 'Удалить endpoint "{name}"?',
    'confirm.regenerate_token': 'Перегенерировать API token? После этого обновите токен во всех внешних интеграциях.',
    'confirm.restart': 'Перезапустить jamanWG? Панель будет недоступна несколько секунд.',
    'confirm.revoke_hwid': 'Отозвать этот HWID? Устройство сможет заново занять слот только после новой авторизации.',
    'clipboard_error': 'Не удалось скопировать в буфер обмена',
    'fetch_config_error': 'Не удалось получить конфиг'
  },
  en: {
    'common.language': 'Language',
    'login.title': 'AmneziaWG Panel',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.sign_in': 'Sign in',
    'nav.clients': 'Clients',
    'nav.endpoints': 'Endpoints',
    'nav.balancer': 'Balancer',
    'nav.events': 'Events',
    'nav.settings': 'Settings',
    'actions.sync': 'Sync',
    'actions.server_config': 'Server config',
    'actions.logout': 'Log out',
    'actions.reset': 'Reset',
    'actions.refresh': 'Refresh',
    'actions.copy': 'Copy',
    'actions.close': 'Close',
    'actions.delete': 'Delete',
    'actions.enable': 'Enable',
    'actions.disable': 'Disable',
    'actions.check': 'Check',
    'pagination.prev': 'Previous',
    'pagination.next': 'Next',
    'pagination.page': 'Page {page} of {totalPages}',
    'status.mode': 'Mode',
    'status.interface': 'Interface',
    'status.clients': 'Clients',
    'status.online': 'Online',
    'status.address_pool': 'IP slots',
    'monitor.title': 'Server report',
    'monitor.subtitle': 'Load, memory, disk, and total AmneziaWG traffic.',
    'monitor.cpu': 'CPU',
    'monitor.memory': 'Memory',
    'monitor.disk': 'Disk',
    'monitor.uptime': 'Uptime',
    'monitor.total_traffic': 'Total traffic',
    'monitor.online_clients': 'Online',
    'monitor.rx': 'received',
    'monitor.tx': 'sent',
    'monitor.free': 'free',
    'monitor.panel_memory': 'panel',
    'monitor.speed': 'speed',
    'traffic.title': 'Traffic analytics',
    'traffic.subtitle': 'Usage history and top clients by traffic.',
    'traffic.daily': 'Daily',
    'traffic.monthly': 'Monthly',
    'traffic.history': 'History',
    'traffic.top_clients': 'Top clients',
    'traffic.empty': 'No data yet.',
    'traffic.period_total': 'period',
    'clients.new_client': 'New client',
    'clients.name': 'Name',
    'clients.name_placeholder': 'Client iPhone',
    'clients.email': 'Email or ID',
    'clients.days': 'Days',
    'clients.traffic_limit': 'Limit, GB',
    'clients.hwid_limit': 'HWID device limit',
    'clients.create': 'Create client',
    'clients.list': 'Client list',
    'clients.search_placeholder': 'Search: name, email, id, key, IP',
    'clients.page_size': 'Per page',
    'clients.shown_all': 'Showing {from}-{to} of {total}',
    'clients.shown_filtered': 'Showing {from}-{to} of {filtered}, total {total}',
    'clients.shown_empty': 'No results',
    'clients.empty': 'No clients yet.',
    'clients.empty_filter': 'No clients match this filter.',
    'clients.open_app': 'To HayVon',
    'clients.config': 'Config',
    'clients.devices': 'HWID',
    'clients.reissue': 'Reissue',
    'clients.online': 'Online',
    'clients.active': 'Active',
    'clients.disabled': 'Disabled',
    'clients.unlimited': 'unlimited',
    'filters.all': 'All',
    'filters.enabled': 'Active',
    'filters.disabled': 'Disabled',
    'filters.online': 'With handshake',
    'table.client': 'Client',
    'table.address': 'Address',
    'table.status': 'Status',
    'table.traffic': 'Traffic',
    'endpoints.title': 'Endpoints and blocking bypass',
    'endpoints.subtitle': 'One key can be delivered through several UDP endpoints: 443, 8443, or a custom port.',
    'endpoints.check_all': 'Check endpoints',
    'endpoints.label': 'Label',
    'endpoints.priority': 'Priority',
    'endpoints.enabled_in_bundles': 'Include in endpoint bundle',
    'endpoints.add': 'Add endpoint',
    'endpoints.empty': 'No endpoints yet.',
    'endpoints.not_checked': 'not checked',
    'endpoints.in_bundles': 'in bundle',
    'endpoints.off': 'off',
    'balancer.title': 'Server balancing',
    'balancer.subtitle': 'Add other jamanWG panels as nodes. Your site can call /api/v1/balancer/allocate and the panel will choose the least loaded server.',
    'balancer.strategy': 'Strategy',
    'balancer.nodes': 'Nodes',
    'balancer.local_clients': 'Local clients',
    'balancer.best_node': 'Best node',
    'balancer.check_all': 'Check nodes',
    'balancer.node_name': 'Name',
    'balancer.api_url': 'API URL',
    'balancer.api_token': 'API token',
    'balancer.group': 'Group',
    'balancer.weight': 'Weight',
    'balancer.max_clients': 'Max clients',
    'balancer.max_traffic': 'Max traffic, GB',
    'balancer.add_node': 'Add node',
    'balancer.empty': 'No balancer nodes yet.',
    'balancer.local_node': 'Local server',
    'balancer.load': 'load',
    'balancer.capacity': 'limit',
    'balancer.status_unknown': 'not checked',
    'toast.balancer_node_added': 'Node added',
    'toast.balancer_node_checked': 'Node checked',
    'toast.balancer_nodes_checked': 'Nodes checked',
    'toast.balancer_node_enabled': 'Node enabled',
    'toast.balancer_node_disabled': 'Node disabled',
    'toast.balancer_node_deleted': 'Node deleted',
    'confirm.delete_balancer_node': 'Delete node "{name}"?',
    'events.title': 'Events',
    'events.subtitle': 'Recent panel, client, node, and HWID activity.',
    'events.shown': 'Showing {from}-{to} of {total}',
    'events.empty': 'Event log is empty.',
    'events.client_id': 'Client',
    'events.action.client.created': 'Client created',
    'events.action.client.updated': 'Client updated',
    'events.action.client.deleted': 'Client deleted',
    'events.action.client.reissued': 'Keys reissued',
    'events.action.client.auto_disabled': 'Client auto disabled',
    'events.action.device.bound': 'HWID bound',
    'events.action.device.revoked': 'HWID revoked',
    'events.action.endpoint.created': 'Endpoint created',
    'events.action.endpoint.updated': 'Endpoint updated',
    'events.action.endpoint.deleted': 'Endpoint deleted',
    'events.action.balancer.node.created': 'Node added',
    'events.action.balancer.node.updated': 'Node updated',
    'events.action.balancer.node.deleted': 'Node deleted',
    'events.action.balancer.assignment.created': 'Client assigned to node',
    'events.action.balancer.assignment.deleted': 'Assignment deleted',
    'events.action.settings.username': 'Admin username changed',
    'events.action.settings.password': 'Admin password changed',
    'events.action.settings.api_token': 'API token changed',
    'events.action.panel.restart': 'Panel restart requested',
    'events.action.sync.warning': 'Sync warning',
    'events.action.peer.remove.warning': 'Peer removal warning',
    'events.message.client_created': 'Created client {name}.',
    'events.message.client_updated': 'Updated client {name}.',
    'events.message.client_deleted': 'Deleted client {name}.',
    'events.message.client_reissued': 'Reissued keys for {name}.',
    'events.message.client_auto_disabled': 'Client {name} was auto disabled: {reason}.',
    'events.message.endpoint_created': 'Created endpoint {name} ({endpoint}).',
    'events.message.endpoint_updated': 'Updated endpoint {name}.',
    'events.message.endpoint_deleted': 'Deleted endpoint {name}.',
    'events.message.node_created': 'Added node {name}.',
    'events.message.node_updated': 'Updated node {name}.',
    'events.message.node_deleted': 'Deleted node {name}.',
    'events.message.hwid_bound': 'Bound HWID {hwid}.',
    'events.message.hwid_revoked': 'Revoked HWID {hwid}.',
    'events.message.username_changed': 'Admin username changed: {from} -> {to}.',
    'events.message.password_changed': 'Admin password changed.',
    'events.message.api_token_changed': 'API token changed.',
    'events.message.api_token_regenerated': 'API token regenerated.',
    'events.message.restart_requested': 'Panel restart was requested by admin.',
    'settings.title': 'Panel settings',
    'settings.subtitle': 'Login, password, API token for external integrations, and service actions.',
    'settings.restart': 'Restart panel',
    'settings.api_token': 'API token for external integrations',
    'settings.regenerate': 'Regenerate',
    'settings.compat_app': 'Compatible app',
    'settings.compat_desc': 'HayVon can connect to jamanWG by panel URL and API token, then load created client configurations.',
    'settings.hayvon_copy': 'Copy connection',
    'settings.hayvon_open': 'Open HayVon',
    'settings.admin_login': 'Admin username',
    'settings.current_password': 'Current password',
    'settings.current_password_placeholder': 'Required to change login/password',
    'settings.new_password': 'New password',
    'settings.new_password_placeholder': 'At least 10 characters',
    'settings.save': 'Save settings',
    'settings.restart_available': 'Restart the jamanWG systemd service',
    'settings.restart_unavailable': 'Restart command is not configured on this server',
    'dialog.client_config': 'Client config',
    'dialog.config': 'Config',
    'dialog.open_app': 'Open in HayVon',
    'dialog.copy_link': 'Copy link',
    'dialog.copy_bundle': 'Copy all endpoints',
    'dialog.copy_conf': 'Copy .conf',
    'dialog.download_conf': 'Download .conf',
    'dialog.qr_available': 'QR is available when qrencode is installed on the server.',
    'dialog.qr_unavailable': 'QR unavailable: qrencode is not installed on the server.',
    'dialog.qr_error': 'qrencode is missing or the config is too large for QR.',
    'devices.title': 'Devices',
    'devices.empty': 'No HWID is bound yet. The device appears after app authorization.',
    'devices.unnamed': 'Unnamed',
    'devices.revoked': 'Revoked',
    'devices.revoke': 'Revoke',
    'theme.light': 'Light theme',
    'theme.dark': 'Dark theme',
    'toast.link_to_app': 'Link copied and sent to HayVon',
    'toast.endpoint_added': 'Endpoint added',
    'toast.endpoint_ok': 'Endpoint is reachable',
    'toast.endpoint_warning': 'Check finished with a warning',
    'toast.endpoint_disabled': 'Endpoint disabled',
    'toast.endpoint_enabled': 'Endpoint enabled',
    'toast.endpoint_deleted': 'Endpoint deleted',
    'toast.endpoints_checked': 'Endpoints checked',
    'toast.client_created': 'Client created',
    'toast.client_disabled': 'Client disabled',
    'toast.client_enabled': 'Client enabled',
    'toast.client_deleted': 'Client deleted',
    'toast.keys_reissued': 'Keys reissued',
    'toast.settings_saved': 'Settings saved',
    'toast.api_copied': 'API token copied',
    'toast.api_updated': 'API token updated',
    'toast.hayvon_panel_copied': 'HayVon connection copied',
    'toast.hayvon_panel_opening': 'Opening HayVon',
    'toast.restart_started': 'Restart started',
    'toast.data_refreshed': 'Data refreshed',
    'toast.synced': 'Interface synced',
    'toast.hwid_revoked': 'HWID revoked',
    'toast.config_copied': 'Config copied',
    'toast.link_copied': 'HayVon link copied',
    'toast.bundle_copied': 'Bundle with all endpoints copied',
    'toast.opening_app': 'Opening HayVon',
    'confirm.reissue': 'Reissue keys for "{name}"? The old config will stop working after sync.',
    'confirm.delete_client': 'Delete client "{name}"?',
    'confirm.delete_endpoint': 'Delete endpoint "{name}"?',
    'confirm.regenerate_token': 'Regenerate API token? Update it in all external integrations afterward.',
    'confirm.restart': 'Restart jamanWG? The panel will be unavailable for a few seconds.',
    'confirm.revoke_hwid': 'Revoke this HWID? The device will be able to take a slot again only after new authorization.',
    'clipboard_error': 'Could not copy to clipboard',
    'fetch_config_error': 'Could not fetch config'
  },
  fa: {
    'common.language': 'زبان',
    'login.title': 'پنل AmneziaWG',
    'login.username': 'نام کاربری',
    'login.password': 'رمز عبور',
    'login.sign_in': 'ورود',
    'nav.clients': 'کاربران',
    'nav.endpoints': 'نقاط اتصال',
    'nav.balancer': 'متعادل سازی',
    'nav.events': 'گزارش',
    'nav.settings': 'تنظیمات',
    'actions.sync': 'همگام سازی',
    'actions.server_config': 'کانفیگ سرور',
    'actions.logout': 'خروج',
    'actions.reset': 'پاک کردن',
    'actions.refresh': 'به روزرسانی',
    'actions.copy': 'کپی',
    'actions.close': 'بستن',
    'actions.delete': 'حذف',
    'actions.enable': 'فعال کردن',
    'actions.disable': 'غیرفعال کردن',
    'actions.check': 'بررسی',
    'pagination.prev': 'قبلی',
    'pagination.next': 'بعدی',
    'pagination.page': 'صفحه {page} از {totalPages}',
    'status.mode': 'حالت',
    'status.interface': 'اینترفیس',
    'status.clients': 'کاربران',
    'status.online': 'آنلاین',
    'status.address_pool': 'ظرفیت IP',
    'monitor.title': 'گزارش سرور',
    'monitor.subtitle': 'بار، حافظه، دیسک و ترافیک کلی AmneziaWG.',
    'monitor.cpu': 'CPU',
    'monitor.memory': 'حافظه',
    'monitor.disk': 'دیسک',
    'monitor.uptime': 'زمان کارکرد',
    'monitor.total_traffic': 'کل ترافیک',
    'monitor.online_clients': 'آنلاین',
    'monitor.rx': 'دریافت',
    'monitor.tx': 'ارسال',
    'monitor.free': 'آزاد',
    'monitor.panel_memory': 'پنل',
    'monitor.speed': 'سرعت',
    'traffic.title': 'تحلیل ترافیک',
    'traffic.subtitle': 'تاریخچه مصرف و کاربران برتر بر اساس ترافیک.',
    'traffic.daily': 'روزانه',
    'traffic.monthly': 'ماهانه',
    'traffic.history': 'تاریخچه',
    'traffic.top_clients': 'کاربران برتر',
    'traffic.empty': 'هنوز داده ای وجود ندارد.',
    'traffic.period_total': 'دوره',
    'clients.new_client': 'کاربر جدید',
    'clients.name': 'نام',
    'clients.name_placeholder': 'آیفون کاربر',
    'clients.email': 'ایمیل یا شناسه',
    'clients.days': 'روز',
    'clients.traffic_limit': 'محدودیت، GB',
    'clients.hwid_limit': 'محدودیت دستگاه HWID',
    'clients.create': 'ساخت کاربر',
    'clients.list': 'فهرست کاربران',
    'clients.search_placeholder': 'جستجو: نام، ایمیل، شناسه، کلید، IP',
    'clients.page_size': 'در هر صفحه',
    'clients.shown_all': 'نمایش {from}-{to} از {total}',
    'clients.shown_filtered': 'نمایش {from}-{to} از {filtered}، مجموع {total}',
    'clients.shown_empty': 'نتیجه ای یافت نشد',
    'clients.empty': 'هنوز کاربری ساخته نشده است.',
    'clients.empty_filter': 'کاربری با این فیلتر پیدا نشد.',
    'clients.open_app': 'در HayVon',
    'clients.config': 'کانفیگ',
    'clients.devices': 'HWID',
    'clients.reissue': 'صدور دوباره',
    'clients.online': 'آنلاین',
    'clients.active': 'فعال',
    'clients.disabled': 'غیرفعال',
    'clients.unlimited': 'نامحدود',
    'filters.all': 'همه',
    'filters.enabled': 'فعال',
    'filters.disabled': 'غیرفعال',
    'filters.online': 'دارای handshake',
    'table.client': 'کاربر',
    'table.address': 'آدرس',
    'table.status': 'وضعیت',
    'table.traffic': 'ترافیک',
    'endpoints.title': 'نقاط اتصال و عبور از محدودیت',
    'endpoints.subtitle': 'یک کلید می تواند از چند UDP endpoint مثل 443، 8443 یا پورت دلخواه ارائه شود.',
    'endpoints.check_all': 'بررسی endpoints',
    'endpoints.label': 'نام',
    'endpoints.priority': 'اولویت',
    'endpoints.enabled_in_bundles': 'افزودن به بسته endpoint',
    'endpoints.add': 'افزودن endpoint',
    'endpoints.empty': 'هنوز endpoint ساخته نشده است.',
    'endpoints.not_checked': 'بررسی نشده',
    'endpoints.in_bundles': 'در بسته',
    'endpoints.off': 'خاموش',
    'balancer.title': 'متعادل سازی سرورها',
    'balancer.subtitle': 'پنل های jamanWG دیگر را به عنوان node اضافه کنید. سایت می تواند /api/v1/balancer/allocate را فراخوانی کند و پنل کم بارترین سرور را انتخاب می کند.',
    'balancer.strategy': 'استراتژی',
    'balancer.nodes': 'نودها',
    'balancer.local_clients': 'کاربران محلی',
    'balancer.best_node': 'بهترین نود',
    'balancer.check_all': 'بررسی نودها',
    'balancer.node_name': 'نام',
    'balancer.api_url': 'API URL',
    'balancer.api_token': 'API token',
    'balancer.group': 'گروه',
    'balancer.weight': 'وزن',
    'balancer.max_clients': 'حداکثر کاربران',
    'balancer.max_traffic': 'حداکثر ترافیک، GB',
    'balancer.add_node': 'افزودن نود',
    'balancer.empty': 'هنوز نود متعادل سازی اضافه نشده است.',
    'balancer.local_node': 'سرور محلی',
    'balancer.load': 'بار',
    'balancer.capacity': 'حد',
    'balancer.status_unknown': 'بررسی نشده',
    'toast.balancer_node_added': 'نود اضافه شد',
    'toast.balancer_node_checked': 'نود بررسی شد',
    'toast.balancer_nodes_checked': 'نودها بررسی شدند',
    'toast.balancer_node_enabled': 'نود فعال شد',
    'toast.balancer_node_disabled': 'نود غیرفعال شد',
    'toast.balancer_node_deleted': 'نود حذف شد',
    'confirm.delete_balancer_node': 'نود "{name}" حذف شود؟',
    'events.title': 'گزارش',
    'events.subtitle': 'آخرین رویدادهای پنل، کاربران، نودها و HWID.',
    'events.shown': 'نمایش {from}-{to} از {total}',
    'events.empty': 'گزارش خالی است.',
    'events.client_id': 'کاربر',
    'events.action.client.created': 'کاربر ساخته شد',
    'events.action.client.updated': 'کاربر به روز شد',
    'events.action.client.deleted': 'کاربر حذف شد',
    'events.action.client.reissued': 'کلیدها دوباره صادر شدند',
    'events.action.client.auto_disabled': 'کاربر خودکار غیرفعال شد',
    'events.action.device.bound': 'HWID متصل شد',
    'events.action.device.revoked': 'HWID لغو شد',
    'events.action.endpoint.created': 'Endpoint ساخته شد',
    'events.action.endpoint.updated': 'Endpoint به روز شد',
    'events.action.endpoint.deleted': 'Endpoint حذف شد',
    'events.action.balancer.node.created': 'نود اضافه شد',
    'events.action.balancer.node.updated': 'نود به روز شد',
    'events.action.balancer.node.deleted': 'نود حذف شد',
    'events.action.balancer.assignment.created': 'کاربر به نود اختصاص یافت',
    'events.action.balancer.assignment.deleted': 'اختصاص حذف شد',
    'events.action.settings.username': 'نام کاربری مدیر تغییر کرد',
    'events.action.settings.password': 'رمز عبور مدیر تغییر کرد',
    'events.action.settings.api_token': 'API token تغییر کرد',
    'events.action.panel.restart': 'درخواست راه اندازی دوباره پنل',
    'events.action.sync.warning': 'هشدار همگام سازی',
    'events.action.peer.remove.warning': 'هشدار حذف peer',
    'events.message.client_created': 'کاربر {name} ساخته شد.',
    'events.message.client_updated': 'کاربر {name} به روز شد.',
    'events.message.client_deleted': 'کاربر {name} حذف شد.',
    'events.message.client_reissued': 'کلیدهای کاربر {name} دوباره صادر شدند.',
    'events.message.client_auto_disabled': 'کاربر {name} خودکار غیرفعال شد: {reason}.',
    'events.message.endpoint_created': 'Endpoint {name} ({endpoint}) ساخته شد.',
    'events.message.endpoint_updated': 'Endpoint {name} به روز شد.',
    'events.message.endpoint_deleted': 'Endpoint {name} حذف شد.',
    'events.message.node_created': 'نود {name} اضافه شد.',
    'events.message.node_updated': 'نود {name} به روز شد.',
    'events.message.node_deleted': 'نود {name} حذف شد.',
    'events.message.hwid_bound': 'HWID {hwid} متصل شد.',
    'events.message.hwid_revoked': 'HWID {hwid} لغو شد.',
    'events.message.username_changed': 'نام کاربری مدیر تغییر کرد: {from} -> {to}.',
    'events.message.password_changed': 'رمز عبور مدیر تغییر کرد.',
    'events.message.api_token_changed': 'API token تغییر کرد.',
    'events.message.api_token_regenerated': 'API token دوباره ساخته شد.',
    'events.message.restart_requested': 'مدیر درخواست راه اندازی دوباره پنل را داد.',
    'settings.title': 'تنظیمات پنل',
    'settings.subtitle': 'نام کاربری، رمز عبور، API token برای اتصال های خارجی و عملیات سرویس.',
    'settings.restart': 'راه اندازی دوباره پنل',
    'settings.api_token': 'API token برای اتصال های خارجی',
    'settings.regenerate': 'ساخت دوباره',
    'settings.compat_app': 'اپلیکیشن سازگار',
    'settings.compat_desc': 'HayVon می تواند با URL پنل و API token به jamanWG وصل شود و کانفیگ های کاربران را بارگیری کند.',
    'settings.hayvon_copy': 'کپی اتصال',
    'settings.hayvon_open': 'باز کردن HayVon',
    'settings.admin_login': 'نام کاربری مدیر',
    'settings.current_password': 'رمز عبور فعلی',
    'settings.current_password_placeholder': 'برای تغییر نام کاربری یا رمز عبور لازم است',
    'settings.new_password': 'رمز عبور جدید',
    'settings.new_password_placeholder': 'حداقل 10 کاراکتر',
    'settings.save': 'ذخیره تنظیمات',
    'settings.restart_available': 'راه اندازی دوباره سرویس systemd jamanWG',
    'settings.restart_unavailable': 'دستور راه اندازی دوباره روی این سرور تنظیم نشده است',
    'dialog.client_config': 'کانفیگ کاربر',
    'dialog.config': 'کانفیگ',
    'dialog.open_app': 'باز کردن در HayVon',
    'dialog.copy_link': 'کپی لینک',
    'dialog.copy_bundle': 'کپی همه endpoints',
    'dialog.copy_conf': 'کپی .conf',
    'dialog.download_conf': 'دانلود .conf',
    'dialog.qr_available': 'QR زمانی در دسترس است که qrencode روی سرور نصب باشد.',
    'dialog.qr_unavailable': 'QR در دسترس نیست: qrencode روی سرور نصب نیست.',
    'dialog.qr_error': 'qrencode وجود ندارد یا کانفیگ برای QR بیش از حد بزرگ است.',
    'devices.title': 'دستگاه ها',
    'devices.empty': 'هنوز HWID متصل نشده است. دستگاه بعد از مجوز اپلیکیشن نمایش داده می شود.',
    'devices.unnamed': 'بدون نام',
    'devices.revoked': 'لغو شده',
    'devices.revoke': 'لغو',
    'theme.light': 'تم روشن',
    'theme.dark': 'تم تاریک',
    'toast.link_to_app': 'لینک کپی شد و به HayVon ارسال شد',
    'toast.endpoint_added': 'Endpoint اضافه شد',
    'toast.endpoint_ok': 'Endpoint در دسترس است',
    'toast.endpoint_warning': 'بررسی با هشدار پایان یافت',
    'toast.endpoint_disabled': 'Endpoint غیرفعال شد',
    'toast.endpoint_enabled': 'Endpoint فعال شد',
    'toast.endpoint_deleted': 'Endpoint حذف شد',
    'toast.endpoints_checked': 'Endpoints بررسی شدند',
    'toast.client_created': 'کاربر ساخته شد',
    'toast.client_disabled': 'کاربر غیرفعال شد',
    'toast.client_enabled': 'کاربر فعال شد',
    'toast.client_deleted': 'کاربر حذف شد',
    'toast.keys_reissued': 'کلیدها دوباره صادر شدند',
    'toast.settings_saved': 'تنظیمات ذخیره شد',
    'toast.api_copied': 'API token کپی شد',
    'toast.api_updated': 'API token به روز شد',
    'toast.hayvon_panel_copied': 'اتصال HayVon کپی شد',
    'toast.hayvon_panel_opening': 'در حال باز کردن HayVon',
    'toast.restart_started': 'راه اندازی دوباره شروع شد',
    'toast.data_refreshed': 'داده ها به روز شدند',
    'toast.synced': 'اینترفیس همگام شد',
    'toast.hwid_revoked': 'HWID لغو شد',
    'toast.config_copied': 'کانفیگ کپی شد',
    'toast.link_copied': 'لینک HayVon کپی شد',
    'toast.bundle_copied': 'بسته endpoints کپی شد',
    'toast.opening_app': 'در حال باز کردن HayVon',
    'confirm.reissue': 'کلیدهای "{name}" دوباره صادر شوند؟ کانفیگ قدیمی بعد از همگام سازی کار نخواهد کرد.',
    'confirm.delete_client': 'کاربر "{name}" حذف شود؟',
    'confirm.delete_endpoint': 'Endpoint "{name}" حذف شود؟',
    'confirm.regenerate_token': 'API token دوباره ساخته شود؟ بعد از آن باید آن را در همه اتصال های خارجی به روز کنید.',
    'confirm.restart': 'jamanWG راه اندازی دوباره شود؟ پنل چند ثانیه در دسترس نخواهد بود.',
    'confirm.revoke_hwid': 'این HWID لغو شود؟ دستگاه فقط بعد از مجوز جدید می تواند دوباره یک اسلات بگیرد.',
    'clipboard_error': 'کپی در کلیپ بورد انجام نشد',
    'fetch_config_error': 'دریافت کانفیگ انجام نشد'
  },
  zh: {
    'common.language': '语言',
    'login.title': 'AmneziaWG 面板',
    'login.username': '用户名',
    'login.password': '密码',
    'login.sign_in': '登录',
    'nav.clients': '客户端',
    'nav.endpoints': 'Endpoints',
    'nav.balancer': '负载均衡',
    'nav.events': '日志',
    'nav.settings': '设置',
    'actions.sync': '同步',
    'actions.server_config': '服务器配置',
    'actions.logout': '退出',
    'actions.reset': '重置',
    'actions.refresh': '刷新',
    'actions.copy': '复制',
    'actions.close': '关闭',
    'actions.delete': '删除',
    'actions.enable': '启用',
    'actions.disable': '停用',
    'actions.check': '检查',
    'pagination.prev': '上一页',
    'pagination.next': '下一页',
    'pagination.page': '第 {page} 页，共 {totalPages} 页',
    'status.mode': '模式',
    'status.interface': '接口',
    'status.clients': '客户端',
    'status.online': '在线',
    'status.address_pool': 'IP 槽位',
    'monitor.title': '服务器报告',
    'monitor.subtitle': '负载、内存、磁盘和 AmneziaWG 总流量。',
    'monitor.cpu': 'CPU',
    'monitor.memory': '内存',
    'monitor.disk': '磁盘',
    'monitor.uptime': '运行时间',
    'monitor.total_traffic': '总流量',
    'monitor.online_clients': '在线',
    'monitor.rx': '接收',
    'monitor.tx': '发送',
    'monitor.free': '空闲',
    'monitor.panel_memory': '面板',
    'monitor.speed': '速度',
    'traffic.title': '流量分析',
    'traffic.subtitle': '用量历史和按流量排序的客户端。',
    'traffic.daily': '按天',
    'traffic.monthly': '按月',
    'traffic.history': '历史',
    'traffic.top_clients': '客户端排行',
    'traffic.empty': '暂无数据。',
    'traffic.period_total': '周期',
    'clients.new_client': '新客户端',
    'clients.name': '名称',
    'clients.name_placeholder': '客户端 iPhone',
    'clients.email': 'Email 或 ID',
    'clients.days': '天数',
    'clients.traffic_limit': '流量限制，GB',
    'clients.hwid_limit': 'HWID 设备限制',
    'clients.create': '创建客户端',
    'clients.list': '客户端列表',
    'clients.search_placeholder': '搜索：名称、email、id、密钥、IP',
    'clients.page_size': '每页',
    'clients.shown_all': '显示 {from}-{to} / {total}',
    'clients.shown_filtered': '显示 {from}-{to} / {filtered}，总计 {total}',
    'clients.shown_empty': '没有结果',
    'clients.empty': '还没有客户端。',
    'clients.empty_filter': '没有符合此筛选的客户端。',
    'clients.open_app': '到 HayVon',
    'clients.config': '配置',
    'clients.devices': 'HWID',
    'clients.reissue': '重新签发',
    'clients.online': '在线',
    'clients.active': '启用',
    'clients.disabled': '停用',
    'clients.unlimited': '无限制',
    'filters.all': '全部',
    'filters.enabled': '启用',
    'filters.disabled': '停用',
    'filters.online': '有 handshake',
    'table.client': '客户端',
    'table.address': '地址',
    'table.status': '状态',
    'table.traffic': '流量',
    'endpoints.title': 'Endpoints 与抗封锁',
    'endpoints.subtitle': '同一个密钥可以通过多个 UDP endpoints 分发：443、8443 或自定义端口。',
    'endpoints.check_all': '检查 endpoints',
    'endpoints.label': '名称',
    'endpoints.priority': '优先级',
    'endpoints.enabled_in_bundles': '加入端点包',
    'endpoints.add': '添加 endpoint',
    'endpoints.empty': '还没有 endpoints。',
    'endpoints.not_checked': '未检查',
    'endpoints.in_bundles': '在端点包中',
    'endpoints.off': '关闭',
    'balancer.title': '服务器负载均衡',
    'balancer.subtitle': '将其他 jamanWG 面板添加为节点。站点可调用 /api/v1/balancer/allocate，面板会选择负载最低的服务器。',
    'balancer.strategy': '策略',
    'balancer.nodes': '节点',
    'balancer.local_clients': '本地客户端',
    'balancer.best_node': '最佳节点',
    'balancer.check_all': '检查节点',
    'balancer.node_name': '名称',
    'balancer.api_url': 'API URL',
    'balancer.api_token': 'API token',
    'balancer.group': '分组',
    'balancer.weight': '权重',
    'balancer.max_clients': '最大客户端',
    'balancer.max_traffic': '最大流量，GB',
    'balancer.add_node': '添加节点',
    'balancer.empty': '还没有负载均衡节点。',
    'balancer.local_node': '本地服务器',
    'balancer.load': '负载',
    'balancer.capacity': '限制',
    'balancer.status_unknown': '未检查',
    'toast.balancer_node_added': '节点已添加',
    'toast.balancer_node_checked': '节点已检查',
    'toast.balancer_nodes_checked': '节点已检查',
    'toast.balancer_node_enabled': '节点已启用',
    'toast.balancer_node_disabled': '节点已停用',
    'toast.balancer_node_deleted': '节点已删除',
    'confirm.delete_balancer_node': '删除节点 "{name}"？',
    'events.title': '日志',
    'events.subtitle': '最近的面板、客户端、节点和 HWID 事件。',
    'events.shown': '显示 {from}-{to} / {total}',
    'events.empty': '日志为空。',
    'events.client_id': '客户端',
    'events.action.client.created': '客户端已创建',
    'events.action.client.updated': '客户端已更新',
    'events.action.client.deleted': '客户端已删除',
    'events.action.client.reissued': '密钥已重新签发',
    'events.action.client.auto_disabled': '客户端已自动停用',
    'events.action.device.bound': 'HWID 已绑定',
    'events.action.device.revoked': 'HWID 已撤销',
    'events.action.endpoint.created': 'Endpoint 已创建',
    'events.action.endpoint.updated': 'Endpoint 已更新',
    'events.action.endpoint.deleted': 'Endpoint 已删除',
    'events.action.balancer.node.created': '节点已添加',
    'events.action.balancer.node.updated': '节点已更新',
    'events.action.balancer.node.deleted': '节点已删除',
    'events.action.balancer.assignment.created': '客户端已分配到节点',
    'events.action.balancer.assignment.deleted': '分配已删除',
    'events.action.settings.username': '管理员用户名已更改',
    'events.action.settings.password': '管理员密码已更改',
    'events.action.settings.api_token': 'API token 已更改',
    'events.action.panel.restart': '已请求重启面板',
    'events.action.sync.warning': '同步警告',
    'events.action.peer.remove.warning': 'Peer 删除警告',
    'events.message.client_created': '已创建客户端 {name}。',
    'events.message.client_updated': '已更新客户端 {name}。',
    'events.message.client_deleted': '已删除客户端 {name}。',
    'events.message.client_reissued': '已为 {name} 重新签发密钥。',
    'events.message.client_auto_disabled': '客户端 {name} 已自动停用：{reason}。',
    'events.message.endpoint_created': '已创建 endpoint {name}（{endpoint}）。',
    'events.message.endpoint_updated': '已更新 endpoint {name}。',
    'events.message.endpoint_deleted': '已删除 endpoint {name}。',
    'events.message.node_created': '已添加节点 {name}。',
    'events.message.node_updated': '已更新节点 {name}。',
    'events.message.node_deleted': '已删除节点 {name}。',
    'events.message.hwid_bound': '已绑定 HWID {hwid}。',
    'events.message.hwid_revoked': '已撤销 HWID {hwid}。',
    'events.message.username_changed': '管理员用户名已更改：{from} -> {to}。',
    'events.message.password_changed': '管理员密码已更改。',
    'events.message.api_token_changed': 'API token 已更改。',
    'events.message.api_token_regenerated': 'API token 已重新生成。',
    'events.message.restart_requested': '管理员已请求重启面板。',
    'settings.title': '面板设置',
    'settings.subtitle': '登录名、密码、外部集成 API token 和服务操作。',
    'settings.restart': '重启面板',
    'settings.api_token': '外部集成 API token',
    'settings.regenerate': '重新生成',
    'settings.compat_app': '兼容应用',
    'settings.compat_desc': 'HayVon 可以通过面板 URL 和 API token 连接 jamanWG，并加载已创建的客户端配置。',
    'settings.hayvon_copy': '复制连接',
    'settings.hayvon_open': '打开 HayVon',
    'settings.admin_login': '管理员用户名',
    'settings.current_password': '当前密码',
    'settings.current_password_placeholder': '修改登录名/密码时需要',
    'settings.new_password': '新密码',
    'settings.new_password_placeholder': '至少 10 个字符',
    'settings.save': '保存设置',
    'settings.restart_available': '重启 jamanWG systemd 服务',
    'settings.restart_unavailable': '此服务器未配置重启命令',
    'dialog.client_config': '客户端配置',
    'dialog.config': '配置',
    'dialog.open_app': '在 HayVon 打开',
    'dialog.copy_link': '复制链接',
    'dialog.copy_bundle': '复制全部 endpoints',
    'dialog.copy_conf': '复制 .conf',
    'dialog.download_conf': '下载 .conf',
    'dialog.qr_available': '服务器安装 qrencode 后可生成 QR。',
    'dialog.qr_unavailable': 'QR 不可用：服务器未安装 qrencode。',
    'dialog.qr_error': '缺少 qrencode，或配置太大无法生成 QR。',
    'devices.title': '设备',
    'devices.empty': '还没有绑定 HWID。设备在应用授权后显示。',
    'devices.unnamed': '未命名',
    'devices.revoked': '已撤销',
    'devices.revoke': '撤销',
    'theme.light': '浅色主题',
    'theme.dark': '深色主题',
    'toast.link_to_app': '链接已复制并发送到 HayVon',
    'toast.endpoint_added': 'Endpoint 已添加',
    'toast.endpoint_ok': 'Endpoint 可用',
    'toast.endpoint_warning': '检查完成，但有警告',
    'toast.endpoint_disabled': 'Endpoint 已停用',
    'toast.endpoint_enabled': 'Endpoint 已启用',
    'toast.endpoint_deleted': 'Endpoint 已删除',
    'toast.endpoints_checked': 'Endpoints 已检查',
    'toast.client_created': '客户端已创建',
    'toast.client_disabled': '客户端已停用',
    'toast.client_enabled': '客户端已启用',
    'toast.client_deleted': '客户端已删除',
    'toast.keys_reissued': '密钥已重新签发',
    'toast.settings_saved': '设置已保存',
    'toast.api_copied': 'API token 已复制',
    'toast.api_updated': 'API token 已更新',
    'toast.hayvon_panel_copied': 'HayVon 连接已复制',
    'toast.hayvon_panel_opening': '正在打开 HayVon',
    'toast.restart_started': '已开始重启',
    'toast.data_refreshed': '数据已刷新',
    'toast.synced': '接口已同步',
    'toast.hwid_revoked': 'HWID 已撤销',
    'toast.config_copied': '配置已复制',
    'toast.link_copied': 'HayVon 链接已复制',
    'toast.bundle_copied': '包含全部 endpoints 的端点包已复制',
    'toast.opening_app': '正在打开 HayVon',
    'confirm.reissue': '重新签发 "{name}" 的密钥？同步后旧配置将停止工作。',
    'confirm.delete_client': '删除客户端 "{name}"？',
    'confirm.delete_endpoint': '删除 endpoint "{name}"？',
    'confirm.regenerate_token': '重新生成 API token？之后需要更新所有外部集成。',
    'confirm.restart': '重启 jamanWG？面板将短暂不可用。',
    'confirm.revoke_hwid': '撤销此 HWID？设备只有重新授权后才能再次占用名额。',
    'clipboard_error': '无法复制到剪贴板',
    'fetch_config_error': '无法获取配置'
  }
};

function t(key, params = {}) {
  const dictionary = translations[state.language] || translations.ru;
  const template = dictionary[key] || translations.ru[key] || key;
  return Object.entries(params).reduce((text, [name, value]) => {
    return text.replaceAll(`{${name}}`, String(value));
  }, template);
}

function applyTranslations() {
  const meta = languageMeta[state.language] || languageMeta.ru;
  document.documentElement.lang = state.language;
  document.documentElement.dir = meta.dir;
  document.title = 'jamanWG';
  el.loginLanguageSelect.value = state.language;
  el.appLanguageSelect.value = state.language;
  if (el.clientPageSizeSelect) el.clientPageSizeSelect.value = String(state.clientPagination.limit || 50);
  if (el.eventsPageSizeSelect) el.eventsPageSizeSelect.value = String(state.eventsPagination.limit || 50);

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((node) => {
    node.title = t(node.dataset.i18nTitle);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((node) => {
    node.setAttribute('aria-label', t(node.dataset.i18nAria));
  });

  setPage(state.page, { load: false });
  applyTheme(document.documentElement.dataset.theme || localStorage.getItem('jamanwg.theme') || 'light');
  renderStatus();
  renderMonitor();
  renderTrafficSummary();
  renderEndpoints();
  renderBalancer();
  renderClients();
  renderEvents(state.events);
}

function setLanguage(language) {
  state.language = translations[language] ? language : 'ru';
  localStorage.setItem('jamanwg.language', state.language);
  applyTranslations();
}

const icons = {
  app: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M9 7h6"/><path d="M9 11h6"/><path d="M10 17h4"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  config: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/></svg>',
  copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  delete: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 1-9 9 9.7 9.7 0 0 1-6.7-2.7L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 9-9 9.7 9.7 0 0 1 6.7 2.7L21 8"/><path d="M21 3v5h-5"/></svg>',
  scale: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18"/><path d="M5 6h14"/><path d="M6 6l-3 7h6Z"/><path d="M18 6l-3 7h6Z"/><path d="M8 21h8"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.72l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/></svg>',
  power: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.5a1.3 1.3 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
  sync: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 1 7 3.35L21 8"/><path d="M21 3v5h-5"/><path d="M12 21a9 9 0 0 1-7-3.35L3 16"/><path d="M3 21v-5h5"/></svg>',
  toggle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>'
};

function icon(name) {
  return `<span class="icon">${icons[name] || ''}</span>`;
}

function hydrateStaticIcons() {
  document.querySelectorAll('.icon[data-icon]').forEach((node) => {
    node.innerHTML = icons[node.dataset.icon] || '';
  });
}

function applyTheme(theme) {
  const resolved = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = resolved;
  localStorage.setItem('jamanwg.theme', resolved);
  if (el.themeButton) {
    const nextIcon = resolved === 'dark' ? 'sun' : 'moon';
    el.themeButton.innerHTML = `<span class="icon" data-icon="${nextIcon}">${icons[nextIcon]}</span>`;
    el.themeButton.title = resolved === 'dark' ? t('theme.light') : t('theme.dark');
    el.themeButton.setAttribute('aria-label', el.themeButton.title);
  }
}

function initTheme() {
  const saved = localStorage.getItem('jamanwg.theme');
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (systemDark ? 'dark' : 'light'));
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(payload?.error || payload || `HTTP ${response.status}`);
  }
  return payload;
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    el.toast.hidden = true;
  }, 2600);
}

function setBusy(button, busy) {
  button.disabled = busy;
}

function debounce(fn, delay = 250) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function writeClipboard(value) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall through to the textarea fallback.
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } finally {
    textarea.remove();
  }
  if (!copied) throw new Error(t('clipboard_error'));
  return true;
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes / 1024;
  let unit = units.shift();
  while (size >= 1024 && units.length) {
    size /= 1024;
    unit = units.shift();
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${unit}`;
}

function formatSpeed(value) {
  if (value === null || value === undefined) return '-';
  return `${formatBytes(value)}/s`;
}

function formatDuration(secondsValue) {
  const seconds = Math.max(0, Number(secondsValue || 0));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString(languageMeta[state.language]?.locale || 'ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function isClientOnline(client) {
  if (!client?.enabled) return false;
  if (!client.latestHandshakeAt) return Boolean(client.online);
  const handshakeAt = new Date(client.latestHandshakeAt).getTime();
  return Number.isFinite(handshakeAt) && handshakeAt >= Date.now() - (5 * 60 * 1000);
}

function endpointStatusLabel(endpoint) {
  if (!endpoint.lastCheckStatus) return t('endpoints.not_checked');
  if (endpoint.lastCheckStatus === 'ok') return `ok · ${endpoint.lastCheckMs || '-'} ms`;
  if (endpoint.lastCheckStatus === 'warning') return `warning · ${endpoint.lastCheckMs || '-'} ms`;
  return endpoint.lastCheckStatus;
}

function endpointHint(endpoint) {
  const parts = [
    endpoint.enabled ? t('endpoints.in_bundles') : t('endpoints.off'),
    `priority ${endpoint.priority}`,
    `MTU ${endpoint.mtu || '-'}`,
    `keepalive ${endpoint.persistentKeepalive ?? '-'}`
  ];
  if (endpoint.lastCheckAt) parts.push(`check ${formatDate(endpoint.lastCheckAt)}`);
  return parts.join(' · ');
}

function renderEndpoints() {
  if (!el.endpointCards) return;
  if (!state.endpoints.length) {
    el.endpointCards.innerHTML = `<div class="empty-state">${escapeHtml(t('endpoints.empty'))}</div>`;
    return;
  }

  el.endpointCards.innerHTML = state.endpoints.map((endpoint) => `
    <article class="endpoint-card ${endpoint.enabled ? '' : 'disabled'}">
      <div class="endpoint-main">
        <div>
          <strong>${escapeHtml(endpoint.label)}</strong>
          <span class="mono">${escapeHtml(endpoint.endpoint)}</span>
        </div>
        <span class="state ${endpoint.lastCheckStatus === 'ok' ? 'on' : 'off'}">${escapeHtml(endpointStatusLabel(endpoint))}</span>
      </div>
      <p class="muted">${escapeHtml(endpointHint(endpoint))}</p>
      ${endpoint.lastCheckError ? `<p class="danger-text">${escapeHtml(endpoint.lastCheckError)}</p>` : ''}
      <div class="row-actions">
        <button class="ghost small" data-endpoint-action="check" data-id="${endpoint.id}" type="button">${icon('refresh')}${escapeHtml(t('actions.check'))}</button>
        <button class="ghost small" data-endpoint-action="toggle" data-id="${endpoint.id}" type="button">${icon('toggle')}${escapeHtml(endpoint.enabled ? t('actions.disable') : t('actions.enable'))}</button>
        <button class="ghost danger small" data-endpoint-action="delete" data-id="${endpoint.id}" type="button">${icon('delete')}${escapeHtml(t('actions.delete'))}</button>
      </div>
    </article>
  `).join('');
}

function balancerStatusLabel(node) {
  if (!node.lastCheckStatus) return t('balancer.status_unknown');
  if (node.lastCheckStatus === 'ok') return `ok · ${node.lastCheckMs || '-'} ms`;
  return node.lastCheckStatus;
}

function balancerNodeHint(node) {
  const parts = [
    `${t('balancer.load')} ${node.loadPercent ?? 0}%`,
    `${node.remoteEnabledClients || 0}/${node.maxClients || '∞'} ${t('status.clients')}`,
    `${formatBytes(node.remoteTrafficBytes || 0)}${node.maxTrafficBytes ? ` / ${formatBytes(node.maxTrafficBytes)}` : ''}`,
    `weight ${node.weight || 100}`,
    `group ${node.groupName || 'default'}`
  ];
  return parts.join(' · ');
}

function renderBalancer() {
  const snapshot = state.balancer || {};
  const nodes = snapshot.nodes || [];
  const local = snapshot.local || {};
  const selectableNodes = [local, ...nodes].filter((node) => node?.selectable);
  const best = selectableNodes
    .slice()
    .sort((a, b) => Number(a.score?.total ?? 9999) - Number(b.score?.total ?? 9999))[0];

  if (el.balancerStrategyMetric) el.balancerStrategyMetric.textContent = snapshot.strategy || '-';
  if (el.balancerNodesMetric) el.balancerNodesMetric.textContent = String(nodes.filter((node) => node.enabled).length);
  if (el.balancerLocalClientsMetric) el.balancerLocalClientsMetric.textContent = String(local.remoteEnabledClients || 0);
  if (el.balancerBestNodeMetric) el.balancerBestNodeMetric.textContent = best?.name || '-';

  if (!el.balancerNodeCards) return;
  const cards = [
    { ...local, id: 'local', name: t('balancer.local_node'), localOnly: true },
    ...nodes
  ].filter((node) => node?.id);

  if (!cards.length) {
    el.balancerNodeCards.innerHTML = `<div class="empty-state">${escapeHtml(t('balancer.empty'))}</div>`;
    return;
  }

  el.balancerNodeCards.innerHTML = cards.map((node) => `
    <article class="endpoint-card ${node.enabled ? '' : 'disabled'}">
      <div class="endpoint-main">
        <div>
          <strong>${escapeHtml(node.name)}</strong>
          <span class="mono">${escapeHtml(node.apiUrl || 'local')}</span>
        </div>
        <span class="state ${node.lastCheckStatus === 'ok' ? 'on' : 'off'}">${escapeHtml(balancerStatusLabel(node))}</span>
      </div>
      <p class="muted">${escapeHtml(balancerNodeHint(node))}</p>
      ${node.lastCheckError ? `<p class="danger-text">${escapeHtml(node.lastCheckError)}</p>` : ''}
      ${node.localOnly ? '' : `
        <div class="row-actions">
          <button class="ghost small" data-balancer-action="check" data-id="${node.id}" type="button">${icon('refresh')}${escapeHtml(t('actions.check'))}</button>
          <button class="ghost small" data-balancer-action="toggle" data-id="${node.id}" type="button">${icon('toggle')}${escapeHtml(node.enabled ? t('actions.disable') : t('actions.enable'))}</button>
          <button class="ghost danger small" data-balancer-action="delete" data-id="${node.id}" type="button">${icon('delete')}${escapeHtml(t('actions.delete'))}</button>
        </div>
      `}
    </article>
  `).join('');
}

function renderStatus() {
  const status = state.status || {};
  el.modeMetric.textContent = status.mock ? 'mock' : status.mode || '-';
  el.ifaceMetric.textContent = status.interfaceName || '-';
  el.endpointMetric.textContent = state.endpoints.find((endpoint) => endpoint.enabled)?.endpoint || status.endpoint || '-';
  const clientTotal = Number(state.clientPagination?.total ?? state.clients.length);
  const onlineCount = Number(state.monitor?.traffic?.onlineClients ?? state.clients.filter(isClientOnline).length);
  const enabledCount = Number(state.monitor?.traffic?.enabledClients ?? state.clients.filter((client) => client.enabled).length);
  el.clientsMetric.textContent = String(clientTotal);
  if (el.onlineMetric) {
    el.onlineMetric.textContent = `${onlineCount}/${enabledCount}`;
    el.onlineMetric.title = `${onlineCount} ${t('status.online')} · ${enabledCount} ${t('filters.enabled')} · ${clientTotal} ${t('filters.all')}`;
  }
  const pool = status.addressPool || {};
  if (el.addressPoolMetric) {
    el.addressPoolMetric.textContent = pool.error ? 'error' : `${pool.used ?? 0}/${pool.total ?? '-'}`;
    el.addressPoolMetric.title = pool.error
      ? pool.error
      : `${pool.cidr || '-'} · free ${pool.free ?? '-'} · ${pool.firstClient || '-'} - ${pool.lastClient || '-'}`;
  }
  const defaultEndpoint = state.endpoints.find((endpoint) => endpoint.enabled)?.endpoint || status.endpoint;
  if (el.clientForm?.elements.endpoint && !el.clientForm.elements.endpoint.value && defaultEndpoint) {
    el.clientForm.elements.endpoint.value = defaultEndpoint;
  }
  if (el.clientForm?.elements.dns && !el.clientForm.elements.dns.value && status.dns) {
    el.clientForm.elements.dns.value = status.dns;
  }
  if (el.clientForm?.elements.allowedIps && !el.clientForm.elements.allowedIps.value && status.allowedIps) {
    el.clientForm.elements.allowedIps.value = status.allowedIps;
  }
}

function renderMonitor() {
  if (!el.monitorGrid) return;
  const monitor = state.monitor;
  if (!monitor) {
    el.monitorGrid.innerHTML = '';
    return;
  }

  const cpu = monitor.cpu || {};
  const memory = monitor.memory || {};
  const disk = monitor.disk || {};
  const traffic = monitor.traffic || {};
  const host = monitor.host || {};

  const tiles = [
    {
      label: t('monitor.cpu'),
      value: `${cpu.loadPercent ?? 0}%`,
      detail: `${cpu.cores || '-'} cores · load ${cpu.load1 ?? '-'} / ${cpu.load5 ?? '-'} / ${cpu.load15 ?? '-'}`
    },
    {
      label: t('monitor.memory'),
      value: `${memory.usedPercent ?? 0}%`,
      detail: `${formatBytes(memory.usedBytes)} / ${formatBytes(memory.totalBytes)} · ${formatBytes(memory.freeBytes)} ${t('monitor.free')} · ${t('monitor.panel_memory')} ${formatBytes(memory.processRssBytes)}`
    },
    {
      label: t('monitor.disk'),
      value: disk.error ? 'error' : `${disk.usedPercent ?? 0}%`,
      detail: disk.error
        ? disk.error
        : `${formatBytes(disk.usedBytes)} / ${formatBytes(disk.totalBytes)} · ${formatBytes(disk.freeBytes)} ${t('monitor.free')}`
    },
    {
      label: t('monitor.uptime'),
      value: formatDuration(host.uptimeSeconds),
      detail: `${host.hostname || '-'} · ${host.platform || '-'} ${host.arch || ''} · ${host.nodeVersion || ''}`
    },
    {
      label: t('monitor.total_traffic'),
      value: formatBytes(traffic.totalBytes),
      detail: `${t('monitor.rx')} ${formatBytes(traffic.rxBytes)} · ${t('monitor.tx')} ${formatBytes(traffic.txBytes)}`
    },
    {
      label: t('monitor.online_clients'),
      value: `${traffic.onlineClients ?? 0}/${traffic.enabledClients ?? 0}`,
      detail: `${traffic.clients ?? 0} total · ${t('monitor.speed')} ${formatSpeed(traffic.totalBps)}`
    }
  ];

  el.monitorGrid.innerHTML = tiles.map((tile) => `
    <div class="monitor-tile">
      <span>${escapeHtml(tile.label)}</span>
      <strong>${escapeHtml(tile.value)}</strong>
      <small>${escapeHtml(tile.detail)}</small>
    </div>
  `).join('');
}

function renderTrafficSummary() {
  if (!el.trafficHistoryList || !el.trafficTopClients) return;
  const summary = state.trafficSummary || {};
  const history = summary.history || [];
  const topClients = summary.topClients || [];
  const maxHistory = Math.max(...history.map((item) => Number(item.totalBytes || 0)), 1);
  const maxClient = Math.max(...topClients.map((item) => Number(item.periodTotalBytes || item.totalBytes || 0)), 1);

  if (!history.length) {
    el.trafficHistoryList.innerHTML = `<div class="muted">${escapeHtml(t('traffic.empty'))}</div>`;
  } else {
    el.trafficHistoryList.innerHTML = history.map((item) => {
      const total = Number(item.totalBytes || 0);
      return `
        <div class="traffic-row">
          <div class="traffic-row-main">
            <strong>${escapeHtml(item.period)}</strong>
            <span>${escapeHtml(formatBytes(total))}</span>
          </div>
          <div class="traffic-bar"><i style="width:${Math.max(2, Math.round((total / maxHistory) * 100))}%"></i></div>
          <small class="muted">${escapeHtml(t('monitor.rx'))} ${escapeHtml(formatBytes(item.rxBytes))} · ${escapeHtml(t('monitor.tx'))} ${escapeHtml(formatBytes(item.txBytes))}</small>
        </div>
      `;
    }).join('');
  }

  if (!topClients.length) {
    el.trafficTopClients.innerHTML = `<div class="muted">${escapeHtml(t('traffic.empty'))}</div>`;
  } else {
    el.trafficTopClients.innerHTML = topClients.map((client) => {
      const periodTotal = Number(client.periodTotalBytes || 0);
      const total = Number(client.totalBytes || 0);
      const barValue = periodTotal || total;
      return `
        <div class="traffic-row">
          <div class="traffic-row-main">
            <strong>${escapeHtml(client.name || client.id)}</strong>
            <span>${escapeHtml(formatBytes(barValue))}</span>
          </div>
          <div class="traffic-bar"><i style="width:${Math.max(2, Math.round((barValue / maxClient) * 100))}%"></i></div>
          <small class="muted">${escapeHtml(client.email || client.address || client.id)} · ${escapeHtml(t('traffic.period_total'))} ${escapeHtml(formatBytes(periodTotal))} · total ${escapeHtml(formatBytes(total))}</small>
        </div>
      `;
    }).join('');
  }
}

function clientTraffic(client) {
  const total = Number(client.rxBytes || 0) + Number(client.txBytes || 0);
  if (!client.trafficLimitBytes) return formatBytes(total);
  return `${formatBytes(total)} / ${formatBytes(client.trafficLimitBytes)}`;
}

function clientHwidText(client) {
  const limit = Number(client.deviceLimit ?? 1);
  const count = Number(client.deviceCount ?? 0);
  return limit === 0 ? `${count} / ${t('clients.unlimited')}` : `${count} / ${limit}`;
}

function clientSearchText(client) {
  return [
    client.name,
    client.email,
    client.id,
    client.address,
    client.allowedIps,
    client.dns,
    client.endpoint,
    client.privateKey,
    client.publicKey,
    client.presharedKey,
    client.latestHandshakeAt,
    client.enabled ? 'активен enabled active' : 'отключен disabled inactive',
    `hwid ${clientHwidText(client)}`,
    clientTraffic(client)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getFilteredClients() {
  const query = state.clientSearch.trim().toLowerCase();
  return state.clients.filter((client) => {
    if (state.clientStatusFilter === 'enabled' && !client.enabled) return false;
    if (state.clientStatusFilter === 'disabled' && client.enabled) return false;
    if (state.clientStatusFilter === 'online' && !isClientOnline(client)) return false;
    if (!query) return true;
    return clientSearchText(client).includes(query);
  });
}

function generateApiToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `jwg_${btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')}`;
}

function base64UrlEncodeUtf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function buildAmneziaLink(configText, client) {
  const payload = base64UrlEncodeUtf8(configText);
  const name = encodeURIComponent(client?.name || 'jamanWG');
  return `amneziawg://${payload}#${name}`;
}

function buildHayVonImportUrl(appLink) {
  return `hayvonapp://import?url=${encodeURIComponent(appLink)}`;
}

function buildHayVonPanelConnectionUrl() {
  const token = String(el.apiTokenOutput?.value || '').trim();
  const params = new URLSearchParams({
    url: window.location.origin,
    token
  });
  return buildHayVonImportUrl(`jamanwg-panel://connect?${params.toString()}`);
}

async function fetchClientConfig(id) {
  return fetch(`/api/clients/${id}/config`, { credentials: 'same-origin' }).then((response) => {
    if (!response.ok) throw new Error(t('fetch_config_error'));
    return response.text();
  });
}

async function fetchClientBundle(id) {
  return api(`/api/clients/${id}/bundle`);
}

async function openClientInApp(id) {
  const client = state.clients.find((item) => item.id === id);
  const configText = await fetchClientConfig(id);
  const appLink = buildAmneziaLink(configText, client);
  await writeClipboard(appLink).catch(() => null);
  window.location.href = buildHayVonImportUrl(appLink);
  showToast(t('toast.link_to_app'));
}

function renderClientPagination() {
  if (!el.clientPagination) return;
  const pagination = state.clientPagination || {};
  const totalPages = Number(pagination.totalPages || 1);
  const page = Number(pagination.page || 1);
  const hasManyPages = totalPages > 1;
  el.clientPagination.hidden = !hasManyPages;
  if (el.clientPageLabel) {
    el.clientPageLabel.textContent = t('pagination.page', { page, totalPages });
  }
  if (el.clientPrevPageButton) el.clientPrevPageButton.disabled = page <= 1;
  if (el.clientNextPageButton) el.clientNextPageButton.disabled = page >= totalPages;
}

function renderClients() {
  el.clientsBody.innerHTML = '';
  const clients = state.clients || [];
  const pagination = state.clientPagination || {};
  const filtered = Number(pagination.filtered ?? clients.length);
  const total = Number(pagination.total ?? filtered);
  const page = Number(pagination.page || 1);
  const limit = Number(pagination.limit || clients.length || 50);
  const from = filtered === 0 ? 0 : ((page - 1) * limit) + 1;
  const to = filtered === 0 ? 0 : Math.min(from + clients.length - 1, filtered);

  if (el.clientPageSizeSelect) el.clientPageSizeSelect.value = String(limit);
  el.emptyState.hidden = clients.length !== 0;
  if (el.clientCountLabel) {
    el.clientCountLabel.textContent = filtered === 0
      ? t('clients.shown_empty')
      : filtered === total
        ? t('clients.shown_all', { from, to, total })
        : t('clients.shown_filtered', { from, to, filtered, total });
  }
  if (!clients.length) {
    el.emptyState.textContent = total
      ? t('clients.empty_filter')
      : t('clients.empty');
  }

  for (const client of clients) {
    const online = isClientOnline(client);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="client-name">
          <strong>${escapeHtml(client.name)}</strong>
          <span>${escapeHtml(client.email || client.id)}</span>
          <span>HWID: ${escapeHtml(clientHwidText(client))}</span>
        </div>
      </td>
      <td class="mono">${escapeHtml(client.address)}</td>
      <td><span class="state ${online ? 'online' : client.enabled ? 'on' : 'off'}">${escapeHtml(online ? t('clients.online') : client.enabled ? t('clients.active') : t('clients.disabled'))}</span></td>
      <td>${escapeHtml(clientTraffic(client))}</td>
      <td>${escapeHtml(formatDate(client.latestHandshakeAt))}</td>
      <td>
        <div class="row-actions">
          <button class="primary small" data-action="app" data-id="${client.id}" type="button">${icon('app')}${escapeHtml(t('clients.open_app'))}</button>
          <button class="ghost small" data-action="config" data-id="${client.id}" type="button">${icon('config')}${escapeHtml(t('clients.config'))}</button>
          <button class="ghost small" data-action="devices" data-id="${client.id}" type="button">${icon('shield')}${escapeHtml(t('clients.devices'))}</button>
          <button class="ghost small" data-action="reissue" data-id="${client.id}" type="button">${icon('refresh')}${escapeHtml(t('clients.reissue'))}</button>
          <button class="ghost small" data-action="toggle" data-id="${client.id}" type="button">${icon('toggle')}${escapeHtml(client.enabled ? t('actions.disable') : t('actions.enable'))}</button>
          <button class="ghost danger small" data-action="delete" data-id="${client.id}" type="button">${icon('delete')}${escapeHtml(t('actions.delete'))}</button>
        </div>
      </td>
    `;
    el.clientsBody.appendChild(tr);
  }

  renderClientPagination();
}

async function loadSettings() {
  const settings = await api('/api/settings');
  state.settings = settings;
  el.apiTokenOutput.value = settings.apiToken || '';
  el.settingsForm.elements.adminUsername.value = settings.adminUsername || 'admin';
  el.restartButton.disabled = !settings.restartAvailable;
  el.restartButton.title = settings.restartAvailable
    ? t('settings.restart_available')
    : t('settings.restart_unavailable');
}

function renderEvents(events) {
  const pagination = state.eventsPagination || {};
  const total = Number(pagination.total ?? events.length);
  const page = Number(pagination.page || 1);
  const limit = Number(pagination.limit || events.length || 50);
  const from = total === 0 ? 0 : ((page - 1) * limit) + 1;
  const to = total === 0 ? 0 : Math.min(from + events.length - 1, total);
  if (el.eventsPageSizeSelect) el.eventsPageSizeSelect.value = String(limit);
  if (el.eventsCountLabel) {
    el.eventsCountLabel.textContent = total
      ? t('events.shown', { from, to, total })
      : t('events.subtitle');
  }

  if (!events.length) {
    el.eventsList.innerHTML = `<div class="muted">${escapeHtml(t('events.empty'))}</div>`;
    renderEventsPagination();
    return;
  }
  el.eventsList.innerHTML = events.map((event) => `
    <div class="event-row">
      <div class="event-row-head">
        <strong>${escapeHtml(eventActionLabel(event.action))}</strong>
        <span class="muted">${escapeHtml(formatDate(event.createdAt))}</span>
      </div>
      <span class="muted">${escapeHtml(eventMessage(event))}</span>
      ${event.clientId ? `<span class="mono event-client">${escapeHtml(t('events.client_id'))}: ${escapeHtml(event.clientId)}</span>` : ''}
    </div>
  `).join('');
  renderEventsPagination();
}

function renderEventsPagination() {
  if (!el.eventsPagination) return;
  const pagination = state.eventsPagination || {};
  const totalPages = Number(pagination.totalPages || 1);
  const page = Number(pagination.page || 1);
  el.eventsPagination.hidden = totalPages <= 1;
  if (el.eventsPageLabel) {
    el.eventsPageLabel.textContent = t('pagination.page', { page, totalPages });
  }
  if (el.eventsPrevPageButton) el.eventsPrevPageButton.disabled = page <= 1;
  if (el.eventsNextPageButton) el.eventsNextPageButton.disabled = page >= totalPages;
}

function eventActionLabel(action) {
  const key = `events.action.${action}`;
  const label = t(key);
  return label === key ? action : label;
}

function eventMessage(event) {
  const message = String(event.message || '');
  const patterns = [
    [/^Created client (.+)$/i, (m) => t('events.message.client_created', { name: m[1] })],
    [/^Updated client (.+)$/i, (m) => t('events.message.client_updated', { name: m[1] })],
    [/^Deleted client (.+)$/i, (m) => t('events.message.client_deleted', { name: m[1] })],
    [/^Reissued keys for (.+)$/i, (m) => t('events.message.client_reissued', { name: m[1] })],
    [/^Client (.+) auto disabled: (.+)$/i, (m) => t('events.message.client_auto_disabled', { name: m[1], reason: m[2] })],
    [/^Created endpoint (.+) ([^ ]+:\d+)$/i, (m) => t('events.message.endpoint_created', { name: m[1], endpoint: m[2] })],
    [/^Updated endpoint (.+)$/i, (m) => t('events.message.endpoint_updated', { name: m[1] })],
    [/^Deleted endpoint (.+)$/i, (m) => t('events.message.endpoint_deleted', { name: m[1] })],
    [/^Created balancer node (.+)$/i, (m) => t('events.message.node_created', { name: m[1] })],
    [/^Updated balancer node (.+)$/i, (m) => t('events.message.node_updated', { name: m[1] })],
    [/^Deleted balancer node (.+)$/i, (m) => t('events.message.node_deleted', { name: m[1] })],
    [/^Bound HWID (.+)$/i, (m) => t('events.message.hwid_bound', { hwid: m[1] })],
    [/^Revoked HWID (.+)$/i, (m) => t('events.message.hwid_revoked', { hwid: m[1] })],
    [/^Admin username changed from (.+) to (.+)$/i, (m) => t('events.message.username_changed', { from: m[1], to: m[2] })],
    [/^Admin password changed$/i, () => t('events.message.password_changed')],
    [/^API token changed$/i, () => t('events.message.api_token_changed')],
    [/^API token regenerated$/i, () => t('events.message.api_token_regenerated')],
    [/^Restart requested from admin panel$/i, () => t('events.message.restart_requested')]
  ];

  for (const [pattern, formatter] of patterns) {
    const match = message.match(pattern);
    if (match) return formatter(match);
  }
  return message;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function loadDashboard() {
  const period = el.trafficPeriodSelect?.value || 'daily';
  const clientsPromise = fetchClients();
  const eventsPromise = fetchEvents();
  const [health, clients, events, endpoints, balancer, traffic] = await Promise.all([
    api('/api/health'),
    clientsPromise,
    eventsPromise,
    api('/api/endpoints'),
    api('/api/balancer'),
    api(`/api/traffic/summary?period=${encodeURIComponent(period)}&days=${period === 'monthly' ? 366 : 30}&limit=10`)
  ]);
  state.status = health.status;
  state.monitor = health.monitor;
  state.trafficSummary = traffic;
  state.clients = clients.clients || state.clients;
  state.clientPagination = clients.pagination || state.clientPagination;
  state.events = events.events || state.events;
  state.eventsPagination = events.pagination || state.eventsPagination;
  state.endpoints = endpoints.endpoints || [];
  state.balancer = balancer;
  state.portProfiles = endpoints.portProfiles || [];
  renderStatus();
  renderMonitor();
  renderTrafficSummary();
  renderEndpoints();
  renderBalancer();
  renderClients();
  renderEvents(state.events);
}

async function fetchClients(page = state.clientPagination.page) {
  const limit = Number(state.clientPagination.limit || 50);
  const params = new URLSearchParams({
    page: String(page || 1),
    limit: String(limit),
    status: state.clientStatusFilter || 'all'
  });
  const query = state.clientSearch.trim();
  if (query) params.set('q', query);
  return api(`/api/clients?${params.toString()}`);
}

async function loadClientsPage(page = state.clientPagination.page) {
  const payload = await fetchClients(page);
  state.clients = payload.clients || [];
  state.clientPagination = payload.pagination || state.clientPagination;
  renderStatus();
  renderClients();
}

async function fetchEvents(page = state.eventsPagination.page) {
  const limit = Number(state.eventsPagination.limit || 50);
  const params = new URLSearchParams({
    page: String(page || 1),
    limit: String(limit)
  });
  return api(`/api/events?${params.toString()}`);
}

async function loadEventsPage(page = state.eventsPagination.page) {
  const payload = await fetchEvents(page);
  state.events = payload.events || [];
  state.eventsPagination = payload.pagination || state.eventsPagination;
  renderEvents(state.events);
}

async function showConfig(id) {
  const client = state.clients.find((item) => item.id === id);
  const configText = await fetchClientConfig(id);

  state.selectedConfig = configText;
  state.selectedClient = client || null;
  state.selectedAppLink = buildAmneziaLink(configText, client);
  el.dialogTitle.textContent = client ? client.name : t('dialog.config');
  el.configOutput.textContent = configText;
  el.downloadConfigLink.href = `/api/clients/${id}/config`;
  el.qrImage.onerror = null;
  if (state.status?.hasQrencode) {
    el.qrHint.textContent = t('dialog.qr_available');
    el.qrImage.src = `/api/clients/${id}/qr.svg?ts=${Date.now()}`;
    el.qrImage.onerror = () => {
      el.qrImage.removeAttribute('src');
      el.qrHint.textContent = t('dialog.qr_error');
    };
  } else {
    el.qrImage.removeAttribute('src');
    el.qrHint.textContent = t('dialog.qr_unavailable');
  }
  el.dialog.showModal();
}

async function showDevices(id) {
  const client = state.clients.find((item) => item.id === id);
  state.selectedDevicesClient = client || null;
  const payload = await api(`/api/clients/${id}/devices`);
  el.devicesDialogTitle.textContent = client ? `HWID: ${client.name}` : `HWID ${t('devices.title')}`;
  renderDevices(payload.devices || []);
  el.devicesDialog.showModal();
}

function renderDevices(devices) {
  if (!devices.length) {
    el.devicesList.innerHTML = `<div class="empty-state">${escapeHtml(t('devices.empty'))}</div>`;
    return;
  }

  el.devicesList.innerHTML = devices.map((device) => `
    <div class="device-row ${device.revokedAt ? 'revoked' : ''}">
      <div>
        <strong class="mono">${escapeHtml(device.hwid)}</strong>
        <span class="muted">${escapeHtml(device.label || t('devices.unnamed'))} · ${escapeHtml(formatDate(device.lastSeenAt))}</span>
        ${device.userAgent ? `<span class="muted">${escapeHtml(device.userAgent)}</span>` : ''}
        ${device.revokedAt ? `<span class="danger-text">${escapeHtml(t('devices.revoked'))}: ${escapeHtml(formatDate(device.revokedAt))}</span>` : ''}
      </div>
      ${device.revokedAt ? '' : `<button class="ghost danger small" data-action="revoke-device" data-id="${device.id}" type="button">${icon('delete')}${escapeHtml(t('devices.revoke'))}</button>`}
    </div>
  `).join('');
}

async function toggleClient(id) {
  const client = state.clients.find((item) => item.id === id);
  if (!client) return;
  await api(`/api/clients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled: !client.enabled })
  });
  showToast(client.enabled ? t('toast.client_disabled') : t('toast.client_enabled'));
  await loadDashboard();
}

async function reissueClient(id) {
  const client = state.clients.find((item) => item.id === id);
  if (!client) return;
  const confirmed = window.confirm(t('confirm.reissue', { name: client.name }));
  if (!confirmed) return;
  const result = await api(`/api/clients/${id}/reissue`, { method: 'POST' });
  showToast(t('toast.keys_reissued'));
  await loadDashboard();
  if (result.config) await showConfig(id);
}

async function deleteClient(id) {
  const client = state.clients.find((item) => item.id === id);
  if (!client) return;
  const confirmed = window.confirm(t('confirm.delete_client', { name: client.name }));
  if (!confirmed) return;
  await api(`/api/clients/${id}`, { method: 'DELETE' });
  showToast(t('toast.client_deleted'));
  await loadDashboard();
}

function buildClientPayload(form) {
  const data = new FormData(form);
  const days = Number(data.get('days') || 0);
  const trafficGb = Number(data.get('trafficGb') || 0);
  const payload = {
    name: data.get('name'),
    email: data.get('email'),
    allowedIps: data.get('allowedIps'),
    dns: data.get('dns'),
    endpoint: data.get('endpoint')
  };

  if (days > 0) {
    payload.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }
  if (trafficGb > 0) {
    payload.trafficLimitBytes = Math.round(trafficGb * 1024 * 1024 * 1024);
  }
  payload.deviceLimit = Number(data.get('deviceLimit') || 1);

  return payload;
}

function buildEndpointPayload(form) {
  const data = new FormData(form);
  return {
    label: data.get('label'),
    endpoint: data.get('endpoint'),
    priority: Number(data.get('priority') || 100),
    mtu: Number(data.get('mtu') || 1280),
    persistentKeepalive: Number(data.get('persistentKeepalive') || 15),
    enabled: data.has('enabled')
  };
}

function buildBalanceNodePayload(form) {
  const data = new FormData(form);
  const maxTrafficGb = Number(data.get('maxTrafficGb') || 0);
  const maxClients = Number(data.get('maxClients') || 0);
  return {
    name: data.get('name'),
    apiUrl: data.get('apiUrl'),
    apiToken: data.get('apiToken'),
    groupName: data.get('groupName') || 'default',
    weight: Number(data.get('weight') || 100),
    maxClients: maxClients > 0 ? maxClients : null,
    maxTrafficBytes: maxTrafficGb > 0 ? Math.round(maxTrafficGb * 1024 * 1024 * 1024) : null,
    enabled: data.has('enabled')
  };
}

async function setPage(page, { load = true } = {}) {
  const nextPage = ['clients', 'endpoints', 'balancer', 'events', 'settings'].includes(page) ? page : 'clients';
  state.page = nextPage;
  el.pageTabs.forEach((button) => {
    button.classList.toggle('active', button.dataset.page === nextPage);
  });
  el.pageViews.forEach((view) => {
    view.classList.toggle('active', view.dataset.pageView === nextPage);
  });
  if (el.pageTitle) el.pageTitle.textContent = t(`nav.${nextPage}`);
  if (load && nextPage === 'balancer') {
    state.balancer = await api('/api/balancer');
    renderBalancer();
  }
  if (load && nextPage === 'events') await loadEventsPage(state.eventsPagination.page || 1);
  if (load && nextPage === 'settings') await loadSettings();
}

el.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  el.loginError.hidden = true;
  const button = event.submitter;
  setBusy(button, true);
  try {
    const data = new FormData(el.loginForm);
    await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        username: data.get('username'),
        password: data.get('password')
      })
    });
    el.loginView.hidden = true;
    el.appView.hidden = false;
    await loadDashboard();
  } catch (error) {
    el.loginError.textContent = error.message;
    el.loginError.hidden = false;
  } finally {
    setBusy(button, false);
  }
});

el.clientForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  el.formError.hidden = true;
  const button = event.submitter;
  setBusy(button, true);
  try {
    const result = await api('/api/clients', {
      method: 'POST',
      body: JSON.stringify(buildClientPayload(el.clientForm))
    });
    el.clientForm.reset();
    el.clientForm.elements.allowedIps.value = state.status?.allowedIps || '0.0.0.0/0';
    el.clientForm.elements.deviceLimit.value = '1';
    if (result.client?.dns) el.clientForm.elements.dns.value = result.client.dns;
    if (result.client?.endpoint) el.clientForm.elements.endpoint.value = result.client.endpoint;
    showToast(result.syncWarning || t('toast.client_created'));
    state.clientPagination.page = 1;
    await loadDashboard();
    if (result.client?.id) await showConfig(result.client.id);
  } catch (error) {
    el.formError.textContent = error.message;
    el.formError.hidden = false;
  } finally {
    setBusy(button, false);
  }
});

el.endpointForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  el.endpointError.hidden = true;
  const button = event.submitter;
  setBusy(button, true);
  try {
    const result = await api('/api/endpoints', {
      method: 'POST',
      body: JSON.stringify(buildEndpointPayload(el.endpointForm))
    });
    state.endpoints = result.endpoints || [];
    el.endpointForm.reset();
    el.endpointForm.elements.priority.value = '100';
    el.endpointForm.elements.mtu.value = '1280';
    el.endpointForm.elements.persistentKeepalive.value = '15';
    el.endpointForm.elements.enabled.checked = true;
    renderEndpoints();
    renderStatus();
    showToast(t('toast.endpoint_added'));
  } catch (error) {
    el.endpointError.textContent = error.message;
    el.endpointError.hidden = false;
  } finally {
    setBusy(button, false);
  }
});

el.endpointCards.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-endpoint-action]');
  if (!button) return;
  const id = button.dataset.id;
  const endpoint = state.endpoints.find((item) => item.id === id);
  if (!endpoint) return;
  setBusy(button, true);
  try {
    if (button.dataset.endpointAction === 'check') {
      const payload = await api(`/api/endpoints/${id}/check`, { method: 'POST' });
      state.endpoints = state.endpoints.map((item) => item.id === id ? payload.endpoint : item);
      showToast(payload.health?.status === 'ok' ? t('toast.endpoint_ok') : t('toast.endpoint_warning'));
    }
    if (button.dataset.endpointAction === 'toggle') {
      const payload = await api(`/api/endpoints/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !endpoint.enabled })
      });
      state.endpoints = payload.endpoints || state.endpoints;
      showToast(endpoint.enabled ? t('toast.endpoint_disabled') : t('toast.endpoint_enabled'));
    }
    if (button.dataset.endpointAction === 'delete') {
      const confirmed = window.confirm(t('confirm.delete_endpoint', { name: endpoint.label }));
      if (!confirmed) return;
      const payload = await api(`/api/endpoints/${id}`, { method: 'DELETE' });
      state.endpoints = payload.endpoints || [];
      showToast(t('toast.endpoint_deleted'));
    }
    renderEndpoints();
    renderStatus();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
});

el.balancerNodeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  el.balancerError.hidden = true;
  const button = event.submitter;
  setBusy(button, true);
  try {
    const result = await api('/api/balancer/nodes', {
      method: 'POST',
      body: JSON.stringify(buildBalanceNodePayload(el.balancerNodeForm))
    });
    state.balancer = result;
    el.balancerNodeForm.reset();
    el.balancerNodeForm.elements.groupName.value = 'default';
    el.balancerNodeForm.elements.weight.value = '100';
    el.balancerNodeForm.elements.enabled.checked = true;
    renderBalancer();
    showToast(t('toast.balancer_node_added'));
  } catch (error) {
    el.balancerError.textContent = error.message;
    el.balancerError.hidden = false;
  } finally {
    setBusy(button, false);
  }
});

el.balancerNodeCards.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-balancer-action]');
  if (!button) return;
  const id = button.dataset.id;
  const node = state.balancer?.nodes?.find((item) => item.id === id);
  if (!node) return;
  setBusy(button, true);
  try {
    if (button.dataset.balancerAction === 'check') {
      const payload = await api(`/api/balancer/nodes/${id}/check`, { method: 'POST' });
      state.balancer = payload;
      showToast(t('toast.balancer_node_checked'));
    }
    if (button.dataset.balancerAction === 'toggle') {
      const payload = await api(`/api/balancer/nodes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...node,
          enabled: !node.enabled
        })
      });
      state.balancer = payload;
      showToast(node.enabled ? t('toast.balancer_node_disabled') : t('toast.balancer_node_enabled'));
    }
    if (button.dataset.balancerAction === 'delete') {
      const confirmed = window.confirm(t('confirm.delete_balancer_node', { name: node.name }));
      if (!confirmed) return;
      const payload = await api(`/api/balancer/nodes/${id}`, { method: 'DELETE' });
      state.balancer = payload;
      showToast(t('toast.balancer_node_deleted'));
    }
    renderBalancer();
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
});

el.clientsBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  setBusy(button, true);
  try {
    const id = button.dataset.id;
    if (button.dataset.action === 'app') await openClientInApp(id);
    if (button.dataset.action === 'config') await showConfig(id);
    if (button.dataset.action === 'devices') await showDevices(id);
    if (button.dataset.action === 'reissue') await reissueClient(id);
    if (button.dataset.action === 'toggle') await toggleClient(id);
    if (button.dataset.action === 'delete') await deleteClient(id);
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
});

el.pageTabs.forEach((button) => {
  button.addEventListener('click', async () => {
    setBusy(button, true);
    try {
      await setPage(button.dataset.page);
    } catch (error) {
      showToast(error.message);
    } finally {
      setBusy(button, false);
    }
  });
});

el.loginLanguageSelect.addEventListener('change', () => {
  setLanguage(el.loginLanguageSelect.value);
});

el.appLanguageSelect.addEventListener('change', () => {
  setLanguage(el.appLanguageSelect.value);
});

el.settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  el.settingsError.hidden = true;
  const button = event.submitter;
  setBusy(button, true);
  try {
    const data = new FormData(el.settingsForm);
    await api('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify({
        adminUsername: data.get('adminUsername'),
        currentPassword: data.get('currentPassword'),
        newPassword: data.get('newPassword') || undefined
      })
    });
    el.settingsForm.elements.currentPassword.value = '';
    el.settingsForm.elements.newPassword.value = '';
    await loadSettings();
    showToast(t('toast.settings_saved'));
  } catch (error) {
    el.settingsError.textContent = error.message;
    el.settingsError.hidden = false;
  } finally {
    setBusy(button, false);
  }
});

el.copyApiTokenButton.addEventListener('click', async () => {
  await writeClipboard(el.apiTokenOutput.value);
  showToast(t('toast.api_copied'));
});

el.copyHayVonPanelButton.addEventListener('click', async () => {
  await writeClipboard(buildHayVonPanelConnectionUrl());
  showToast(t('toast.hayvon_panel_copied'));
});

el.openHayVonPanelButton.addEventListener('click', () => {
  window.location.href = buildHayVonPanelConnectionUrl();
  showToast(t('toast.hayvon_panel_opening'));
});

el.regenerateApiTokenButton.addEventListener('click', async () => {
  const confirmed = window.confirm(t('confirm.regenerate_token'));
  if (!confirmed) return;
  setBusy(el.regenerateApiTokenButton, true);
  try {
    const payload = await api('/api/settings/api-token/regenerate', { method: 'POST' });
    el.apiTokenOutput.value = payload.apiToken;
    showToast(t('toast.api_updated'));
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(el.regenerateApiTokenButton, false);
  }
});

const reloadClientsFromFirstPage = debounce(async () => {
  try {
    await loadClientsPage(1);
  } catch (error) {
    showToast(error.message);
  }
}, 250);

el.clientSearchInput.addEventListener('input', () => {
  state.clientSearch = el.clientSearchInput.value;
  reloadClientsFromFirstPage();
});

el.clientStatusFilter.addEventListener('change', async () => {
  state.clientStatusFilter = el.clientStatusFilter.value;
  try {
    await loadClientsPage(1);
  } catch (error) {
    showToast(error.message);
  }
});

el.clientPageSizeSelect?.addEventListener('change', async () => {
  state.clientPagination.limit = Number(el.clientPageSizeSelect.value || 50);
  localStorage.setItem('jamanwg.clients.limit', String(state.clientPagination.limit));
  try {
    await loadClientsPage(1);
  } catch (error) {
    showToast(error.message);
  }
});

el.clientPrevPageButton?.addEventListener('click', async () => {
  try {
    await loadClientsPage(Math.max(1, Number(state.clientPagination.page || 1) - 1));
  } catch (error) {
    showToast(error.message);
  }
});

el.clientNextPageButton?.addEventListener('click', async () => {
  try {
    await loadClientsPage(Number(state.clientPagination.page || 1) + 1);
  } catch (error) {
    showToast(error.message);
  }
});

el.clearClientFilterButton.addEventListener('click', async () => {
  state.clientSearch = '';
  state.clientStatusFilter = 'all';
  el.clientSearchInput.value = '';
  el.clientStatusFilter.value = 'all';
  try {
    await loadClientsPage(1);
  } catch (error) {
    showToast(error.message);
  }
});

el.checkEndpointsButton.addEventListener('click', async () => {
  setBusy(el.checkEndpointsButton, true);
  try {
    const payload = await api('/api/endpoints/check-all', { method: 'POST' });
    state.endpoints = payload.endpoints || state.endpoints;
    renderEndpoints();
    renderStatus();
    showToast(t('toast.endpoints_checked'));
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(el.checkEndpointsButton, false);
  }
});

el.checkBalancerButton.addEventListener('click', async () => {
  setBusy(el.checkBalancerButton, true);
  try {
    const payload = await api('/api/balancer/check-all', { method: 'POST' });
    state.balancer = payload;
    renderBalancer();
    showToast(t('toast.balancer_nodes_checked'));
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(el.checkBalancerButton, false);
  }
});

el.apiTokenOutput.addEventListener('change', async () => {
  const token = el.apiTokenOutput.value.trim() || generateApiToken();
  await api('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify({ apiToken: token })
  });
  await loadSettings();
});

el.restartButton.addEventListener('click', async () => {
  const confirmed = window.confirm(t('confirm.restart'));
  if (!confirmed) return;
  setBusy(el.restartButton, true);
  try {
    await api('/api/restart', { method: 'POST' });
    showToast(t('toast.restart_started'));
  } catch (error) {
    showToast(error.message);
    setBusy(el.restartButton, false);
  }
});

el.refreshButton.addEventListener('click', async () => {
  setBusy(el.refreshButton, true);
  try {
    await loadDashboard();
    showToast(t('toast.data_refreshed'));
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(el.refreshButton, false);
  }
});

async function refreshTrafficSummary() {
  const period = el.trafficPeriodSelect?.value || 'daily';
  state.trafficSummary = await api(`/api/traffic/summary?period=${encodeURIComponent(period)}&days=${period === 'monthly' ? 366 : 30}&limit=10`);
  renderTrafficSummary();
}

el.trafficPeriodSelect?.addEventListener('change', async () => {
  try {
    await refreshTrafficSummary();
  } catch (error) {
    showToast(error.message);
  }
});

el.trafficRefreshButton?.addEventListener('click', async () => {
  setBusy(el.trafficRefreshButton, true);
  try {
    await refreshTrafficSummary();
    showToast(t('toast.data_refreshed'));
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(el.trafficRefreshButton, false);
  }
});

el.eventsRefreshButton.addEventListener('click', async () => {
  setBusy(el.eventsRefreshButton, true);
  try {
    await loadEventsPage(state.eventsPagination.page || 1);
    showToast(t('toast.data_refreshed'));
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(el.eventsRefreshButton, false);
  }
});

el.eventsPageSizeSelect?.addEventListener('change', async () => {
  state.eventsPagination.limit = Number(el.eventsPageSizeSelect.value || 50);
  localStorage.setItem('jamanwg.events.limit', String(state.eventsPagination.limit));
  try {
    await loadEventsPage(1);
  } catch (error) {
    showToast(error.message);
  }
});

el.eventsPrevPageButton?.addEventListener('click', async () => {
  try {
    await loadEventsPage(Math.max(1, Number(state.eventsPagination.page || 1) - 1));
  } catch (error) {
    showToast(error.message);
  }
});

el.eventsNextPageButton?.addEventListener('click', async () => {
  try {
    await loadEventsPage(Number(state.eventsPagination.page || 1) + 1);
  } catch (error) {
    showToast(error.message);
  }
});

el.syncButton.addEventListener('click', async () => {
  setBusy(el.syncButton, true);
  try {
    await api('/api/sync', { method: 'POST' });
    await loadDashboard();
    showToast(t('toast.synced'));
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(el.syncButton, false);
  }
});

el.logoutButton.addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  el.appView.hidden = true;
  el.loginView.hidden = false;
});

el.themeButton.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

el.closeDialogButton.addEventListener('click', () => {
  el.dialog.close();
});

el.closeDevicesDialogButton.addEventListener('click', () => {
  el.devicesDialog.close();
});

el.devicesList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action="revoke-device"]');
  if (!button || !state.selectedDevicesClient) return;
  const confirmed = window.confirm(t('confirm.revoke_hwid'));
  if (!confirmed) return;
  setBusy(button, true);
  try {
    const payload = await api(`/api/clients/${state.selectedDevicesClient.id}/devices/${button.dataset.id}`, { method: 'DELETE' });
    renderDevices(payload.devices || []);
    await loadDashboard();
    showToast(t('toast.hwid_revoked'));
  } catch (error) {
    showToast(error.message);
  } finally {
    setBusy(button, false);
  }
});

el.copyConfigButton.addEventListener('click', async () => {
  await writeClipboard(state.selectedConfig);
  showToast(t('toast.config_copied'));
});

el.copyLinkButton.addEventListener('click', async () => {
  await writeClipboard(state.selectedAppLink);
  showToast(t('toast.link_copied'));
});

el.copyBundleButton.addEventListener('click', async () => {
  if (!state.selectedClient?.id) return;
  const payload = await fetchClientBundle(state.selectedClient.id);
  await writeClipboard(payload.bundle || '');
  showToast(t('toast.bundle_copied'));
});

el.openAppButton.addEventListener('click', async () => {
  if (!state.selectedAppLink) return;
  await writeClipboard(state.selectedAppLink).catch(() => null);
  window.location.href = buildHayVonImportUrl(state.selectedAppLink);
  showToast(t('toast.opening_app'));
});

async function boot() {
  const session = await api('/api/session');
  state.status = session.status;
  if (session.authenticated) {
    el.loginView.hidden = true;
    el.appView.hidden = false;
    await loadDashboard();
  } else {
    el.appView.hidden = true;
    el.loginView.hidden = false;
    renderStatus();
  }
}

hydrateStaticIcons();
initTheme();
setLanguage(state.language);
boot().catch((error) => {
  el.loginView.hidden = false;
  el.loginError.textContent = error.message;
  el.loginError.hidden = false;
});
