// C-Money Vue.js 应用
const { createApp, ref, reactive, computed, onMounted } = Vue;
const { createRouter, createWebHashHistory } = VueRouter;

// API配置
const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// Axios配置
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// 请求拦截器
api.interceptors.request.use(function(config) {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = 'Bearer ' + token;
    }
    return config;
});

// 响应拦截器
api.interceptors.response.use(
    function(response) {
        return response;
    },
    async function(error) {
        if (error.response && error.response.status === 401) {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const response = await axios.post(API_BASE_URL + '/auth/token/refresh/', {
                        refresh: refreshToken
                    });
                    localStorage.setItem('access_token', response.data.access);
                    error.config.headers.Authorization = 'Bearer ' + response.data.access;
                    return api(error.config);
                } catch (refreshError) {
                    localStorage.clear();
                    router.push('/login');
                }
            } else {
                localStorage.clear();
                router.push('/login');
            }
        }
        return Promise.reject(error);
    }
);

// 登录组件
const Login = {
    template: `
        <div class="auth-container">
            <div class="auth-card">
                <div class="auth-header">
                    <div class="auth-logo">
                        <i class="ri-wallet-3-fill"></i>
                    </div>
                    <h1 class="auth-title">C-Money</h1>
                    <p class="auth-subtitle">大学生个人收支管理系统</p>
                </div>

                <form @submit.prevent="handleLogin">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="ri-user-line"></i> 用户名
                        </label>
                        <input
                            type="text"
                            class="form-control"
                            v-model="formData.username"
                            placeholder="请输入用户名"
                            required
                            autofocus
                        >
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <i class="ri-lock-line"></i> 密码
                        </label>
                        <input
                            type="password"
                            class="form-control"
                            v-model="formData.password"
                            placeholder="请输入密码"
                            required
                        >
                    </div>

                    <div class="form-group" style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="display: flex; align-items: center; margin: 0;">
                            <input type="checkbox" v-model="rememberMe" style="margin-right: 6px;">
                            <span style="font-size: 14px;">记住我</span>
                        </label>
                    </div>

                    <button type="submit" class="btn btn-primary" :disabled="isSubmitting" style="width: 100%; margin-top: 10px;">
                        <i class="ri-login-box-line"></i>
                        {{ isSubmitting ? '登录中...' : '登录' }}
                    </button>
                </form>

                <div class="auth-footer">
                    还没有账号？ <a href="#/register" class="auth-link">立即注册</a>
                </div>
            </div>
        </div>
    `,
    setup() {
        const formData = reactive({
            username: '',
            password: ''
        });

        const isSubmitting = ref(false);
        const rememberMe = ref(false);

        const handleLogin = async function() {
            isSubmitting.value = true;

            try {
                const response = await api.post('/auth/token/', formData);
                localStorage.setItem('access_token', response.data.access);
                localStorage.setItem('refresh_token', response.data.refresh);
                localStorage.setItem('username', formData.username);

                if (rememberMe.value) {
                    localStorage.setItem('remember_username', formData.username);
                } else {
                    localStorage.removeItem('remember_username');
                }

                router.push('/');
            } catch (error) {
                alert('登录失败：' + (error.response?.data?.detail || '用户名或密码错误'));
            } finally {
                isSubmitting.value = false;
            }
        };

        onMounted(function() {
            const savedUsername = localStorage.getItem('remember_username');
            if (savedUsername) {
                formData.username = savedUsername;
                rememberMe.value = true;
            }
        });

        return {
            formData,
            isSubmitting,
            rememberMe,
            handleLogin
        };
    }
};

// 注册组件
const Register = {
    template: `
        <div class="auth-container">
            <div class="auth-card">
                <div class="auth-header">
                    <div class="auth-logo">
                        <i class="ri-wallet-3-fill"></i>
                    </div>
                    <h1 class="auth-title">注册账号</h1>
                    <p class="auth-subtitle">加入C-Money，管理你的财务</p>
                </div>

                <form @submit.prevent="handleRegister">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="ri-user-line"></i> 用户名 <span style="color: red;">*</span>
                        </label>
                        <input
                            type="text"
                            class="form-control"
                            v-model="formData.username"
                            placeholder="请输入用户名"
                            required
                            minlength="3"
                        >
                        <small class="form-hint">3-20个字符</small>
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <i class="ri-mail-line"></i> 邮箱 <span style="color: red;">*</span>
                        </label>
                        <input
                            type="email"
                            class="form-control"
                            v-model="formData.email"
                            placeholder="请输入邮箱"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <i class="ri-phone-line"></i> 手机号
                        </label>
                        <input
                            type="tel"
                            class="form-control"
                            v-model="formData.phone"
                            placeholder="请输入手机号（选填）"
                            pattern="[0-9]{11}"
                        >
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <i class="ri-id-card-line"></i> 学号
                        </label>
                        <input
                            type="text"
                            class="form-control"
                            v-model="formData.student_id"
                            placeholder="请输入学号（选填）"
                        >
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <i class="ri-lock-line"></i> 密码 <span style="color: red;">*</span>
                        </label>
                        <input
                            type="password"
                            class="form-control"
                            v-model="formData.password"
                            placeholder="请输入密码"
                            required
                            minlength="6"
                        >
                        <small class="form-hint">至少6个字符</small>
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <i class="ri-lock-password-line"></i> 确认密码 <span style="color: red;">*</span>
                        </label>
                        <input
                            type="password"
                            class="form-control"
                            v-model="formData.password_confirm"
                            placeholder="请再次输入密码"
                            required
                            minlength="6"
                        >
                    </div>

                    <button type="submit" class="btn btn-primary" :disabled="isSubmitting" style="width: 100%">
                        <i class="ri-user-add-line"></i>
                        {{ isSubmitting ? '注册中...' : '注册' }}
                    </button>
                </form>

                <div class="auth-footer">
                    已有账号？ <a href="#/login" class="auth-link">立即登录</a>
                </div>
            </div>
        </div>
    `,
    setup() {
        const formData = reactive({
            username: '',
            email: '',
            phone: '',
            student_id: '',
            password: '',
            password_confirm: ''
        });

        const isSubmitting = ref(false);

        const handleRegister = async function() {
            if (formData.password !== formData.password_confirm) {
                alert('两次输入的密码不一致');
                return;
            }

            isSubmitting.value = true;

            try {
                const response = await api.post('/auth/register/', formData);
                alert('注册成功！请登录');
                router.push('/login');
            } catch (error) {
                const errors = error.response?.data;
                let errorMsg = '注册失败';

                if (errors) {
                    if (typeof errors === 'object') {
                        const messages = [];
                        for (const key in errors) {
                            const value = errors[key];
                            if (Array.isArray(value)) {
                                messages.push(...value);
                            } else {
                                messages.push(value);
                            }
                        }
                        errorMsg = messages.join('\n');
                    } else {
                        errorMsg = errors;
                    }
                }
                alert(errorMsg);
            } finally {
                isSubmitting.value = false;
            }
        };

        return {
            formData,
            isSubmitting,
            handleRegister
        };
    }
};

// 仪表板组件
const Dashboard = {
    template: `
        <div>
            <h2 style="margin: 20px 0">仪表盘</h2>

            <!-- 统计卡片 -->
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-icon income">
                        <i class="ri-arrow-down-circle-line"></i>
                    </div>
                    <div class="stat-label">本月收入</div>
                    <div class="stat-value">¥{{ summary.income || '0.00' }}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon expense">
                        <i class="ri-arrow-up-circle-line"></i>
                    </div>
                    <div class="stat-label">本月支出</div>
                    <div class="stat-value">¥{{ summary.expense || '0.00' }}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon balance">
                        <i class="ri-wallet-line"></i>
                    </div>
                    <div class="stat-label">本月结余</div>
                    <div class="stat-value">¥{{ summary.balance || '0.00' }}</div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon budget">
                        <i class="ri-pie-chart-line"></i>
                    </div>
                    <div class="stat-label">预算使用</div>
                    <div class="stat-value">{{ budget.used_percent || '0' }}%</div>
                </div>
            </div>

            <!-- 最近交易 -->
            <div class="card" style="margin-top: 20px;">
                <div class="card-header">
                    <h3 class="card-title">最近交易</h3>
                    <a href="#/transactions" class="btn btn-outline">
                        查看全部 <i class="ri-arrow-right-line"></i>
                    </a>
                </div>
                <div v-if="recentTransactions.length">
                    <ul class="transaction-list">
                        <li v-for="item in recentTransactions.slice(0, 5)" :key="item.id" class="transaction-item">
                            <div class="transaction-info">
                                <div class="transaction-icon">
                                    <i class="ri-price-tag-3-line"></i>
                                </div>
                                <div class="transaction-details">
                                    <h4>{{ item.category_info?.name || '未分类' }}</h4>
                                    <p>{{ item.description || '无备注' }}</p>
                                </div>
                            </div>
                            <div class="transaction-amount" :class="getTransactionType(item)">
                                <div class="amount">{{ getAmountPrefix(item) }}¥{{ item.amount }}</div>
                                <div class="date">{{ formatDate(item.transaction_date) }}</div>
                            </div>
                        </li>
                    </ul>
                </div>
                <div v-else class="empty-state">
                    <i class="ri-inbox-line"></i>
                    <h3>暂无交易记录</h3>
                    <p>点击右下角按钮开始记账</p>
                </div>
            </div>
        </div>
    `,
    setup() {
        const summary = ref({});
        const budget = ref({});
        const recentTransactions = ref([]);

        const loadDashboardData = async function() {
            try {
                const summaryRes = await api.get('/reports/summary/');
                const data = summaryRes.data;
                
                summary.value = {
                    income: data.income?.total || 0,
                    expense: data.expense?.total || 0,
                    balance: data.balance || 0
                };
                
                budget.value = {
                    used_percent: data.budget?.usage_percentage || 0
                };

                const transRes = await api.get('/transactions/?limit=5');
                recentTransactions.value = transRes.data.results || [];
            } catch (error) {
                console.error('加载数据失败', error);
            }
        };

        const formatDate = function(date) {
            return new Date(date).toLocaleDateString('zh-CN', {
                month: '2-digit',
                day: '2-digit'
            });
        };

        const getTransactionType = function(item) {
            if (item.category_info && item.category_info.type) {
                return item.category_info.type;
            }
            return item.is_income ? 'income' : 'expense';
        };

        const getAmountPrefix = function(item) {
            const type = getTransactionType(item);
            return type === 'income' ? '+' : '-';
        };

        onMounted(function() {
            loadDashboardData();
        });

        return {
            summary,
            budget,
            recentTransactions,
            formatDate,
            getTransactionType,
            getAmountPrefix
        };
    }
};

// 交易列表组件
const Transactions = {
    template: `
        <div>
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">账单明细</h3>
                    <button @click="showAddModal = true" class="btn btn-primary">
                        <i class="ri-add-line"></i> 记一笔
                    </button>
                </div>

                <!-- 筛选区域 -->
                <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                    <select v-model="filters.category" class="form-control" style="width: 200px;">
                        <option value="">所有分类</option>
                        <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                            {{ cat.name }} ({{ cat.type === 'income' ? '收入' : '支出' }})
                        </option>
                    </select>
                    <input
                        type="date"
                        v-model="filters.start_date"
                        class="form-control"
                        style="width: 200px;"
                        placeholder="开始日期"
                    >
                    <input
                        type="date"
                        v-model="filters.end_date"
                        class="form-control"
                        style="width: 200px;"
                        placeholder="结束日期"
                    >
                    <button @click="loadTransactions" class="btn btn-outline">
                        <i class="ri-search-line"></i> 搜索
                    </button>
                </div>

                <!-- 交易列表 -->
                <div v-if="transactions.length">
                    <ul class="transaction-list">
                        <li v-for="item in transactions" :key="item.id" class="transaction-item">
                            <div class="transaction-info">
                                <div class="transaction-icon" :style="{ background: getCategoryColor(item.category_info) + '20', color: getCategoryColor(item.category_info) }">
                                    <i :class="getCategoryIcon(item.category_info)"></i>
                                </div>
                                <div class="transaction-details">
                                    <h4>{{ item.category_info?.name || '未分类' }}</h4>
                                    <p>{{ item.description || '无备注' }}</p>
                                </div>
                            </div>
                            <div class="transaction-amount" :class="getTransactionType(item)">
                                <div class="amount">{{ getAmountPrefix(item) }}¥{{ item.amount }}</div>
                                <div class="date">{{ formatDate(item.transaction_date) }}</div>
                                <div style="margin-top: 8px;">
                                    <button @click="editTransaction(item)" class="btn btn-outline" style="padding: 4px 8px; font-size: 12px;">
                                        <i class="ri-edit-line"></i>
                                    </button>
                                    <button @click="deleteTransaction(item.id)" class="btn btn-outline" style="padding: 4px 8px; font-size: 12px; margin-left: 4px;">
                                        <i class="ri-delete-bin-line"></i>
                                    </button>
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
                <div v-else-if="!loading" class="empty-state">
                    <i class="ri-inbox-line"></i>
                    <h3>暂无交易记录</h3>
                    <p>点击上方"记一笔"开始记账</p>
                </div>
                <div v-if="loading" class="loading">
                    <div class="spinner"></div>
                </div>
            </div>

            <!-- 添加/编辑交易模态框 -->
            <div class="modal" :class="{ show: showAddModal }">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">{{ editingTransaction ? '编辑账单' : '记一笔' }}</h3>
                        <button @click="closeModal" class="modal-close">
                            <i class="ri-close-line"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form @submit.prevent="saveTransaction">
                            <div class="form-group">
                                <label class="form-label">类型</label>
                                <div style="display: flex; gap: 12px;">
                                    <button
                                        type="button"
                                        @click="transactionForm.type = 'expense'"
                                        class="btn"
                                        :class="transactionForm.type === 'expense' ? 'btn-danger' : 'btn-outline'"
                                        style="flex: 1;"
                                    >
                                        <i class="ri-arrow-up-circle-line"></i> 支出
                                    </button>
                                    <button
                                        type="button"
                                        @click="transactionForm.type = 'income'"
                                        class="btn"
                                        :class="transactionForm.type === 'income' ? 'btn-success' : 'btn-outline'"
                                        style="flex: 1;"
                                    >
                                        <i class="ri-arrow-down-circle-line"></i> 收入
                                    </button>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">金额</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    class="form-control"
                                    v-model="transactionForm.amount"
                                    placeholder="0.00"
                                    required
                                >
                            </div>

                            <div class="form-group">
                                <label class="form-label">分类</label>
                                <select v-model="transactionForm.category" class="form-control" required>
                                    <option value="">请选择分类</option>
                                    <option
                                        v-for="cat in filteredCategories"
                                        :key="cat.id"
                                        :value="cat.id"
                                    >
                                        {{ cat.name }}
                                    </option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label">日期</label>
                                <input
                                    type="date"
                                    class="form-control"
                                    v-model="transactionForm.transaction_date"
                                    required
                                >
                            </div>

                            <div class="form-group">
                                <label class="form-label">备注</label>
                                <textarea
                                    class="form-control"
                                    v-model="transactionForm.description"
                                    rows="3"
                                    placeholder="选填"
                                ></textarea>
                            </div>

                            <div style="display: flex; gap: 12px;">
                                <button type="button" @click="closeModal" class="btn btn-outline" style="flex: 1;">
                                    取消
                                </button>
                                <button type="submit" class="btn btn-primary" style="flex: 1;">
                                    保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const transactions = ref([]);
        const categories = ref([]);
        const loading = ref(false);
        const showAddModal = ref(false);
        const editingTransaction = ref(null);

        const filters = reactive({
            category: '',
            start_date: '',
            end_date: ''
        });

        const transactionForm = reactive({
            type: 'expense',
            amount: '',
            category: '',
            transaction_date: new Date().toISOString().split('T')[0],
            description: ''
        });

        const filteredCategories = computed(function() {
            return categories.value.filter(function(cat) {
                return cat.type === transactionForm.type;
            });
        });

        const loadTransactions = async function() {
            loading.value = true;
            try {
                const params = {};
                if (filters.category) params.category = filters.category;
                if (filters.start_date) params.transaction_date__gte = filters.start_date;
                if (filters.end_date) params.transaction_date__lte = filters.end_date;

                const response = await api.get('/transactions/', { params: params });
                console.log('交易数据:', response.data);
                transactions.value = response.data.results || [];
            } catch (error) {
                console.error('加载交易失败', error);
            } finally {
                loading.value = false;
            }
        };

        const loadCategories = async function() {
            try {
                const response = await api.get('/categories/');
                categories.value = response.data.results || [];
            } catch (error) {
                console.error('加载分类失败', error);
            }
        };

        const saveTransaction = async function() {
            try {
                const data = {
                    amount: transactionForm.amount,
                    category: transactionForm.category,
                    transaction_date: transactionForm.transaction_date,
                    description: transactionForm.description
                };

                if (editingTransaction.value) {
                    await api.patch('/transactions/' + editingTransaction.value.id + '/', data);
                    alert('更新成功！');
                } else {
                    await api.post('/transactions/', data);
                    alert('添加成功！');
                }

                closeModal();
                loadTransactions();
            } catch (error) {
                alert('操作失败：' + (error.response?.data?.detail || '请重试'));
            }
        };

        const editTransaction = function(transaction) {
            editingTransaction.value = transaction;
            transactionForm.type = transaction.category_info?.type || 'expense';
            transactionForm.amount = transaction.amount;
            transactionForm.category = transaction.category;
            transactionForm.transaction_date = transaction.transaction_date;
            transactionForm.description = transaction.description || '';
            showAddModal.value = true;
        };

        const deleteTransaction = async function(id) {
            if (!confirm('确定要删除这条记录吗？')) return;

            try {
                await api.delete('/transactions/' + id + '/');
                alert('删除成功！');
                loadTransactions();
            } catch (error) {
                alert('删除失败');
            }
        };

        const closeModal = function() {
            showAddModal.value = false;
            editingTransaction.value = null;
            transactionForm.type = 'expense';
            transactionForm.amount = '';
            transactionForm.category = '';
            transactionForm.transaction_date = new Date().toISOString().split('T')[0];
            transactionForm.description = '';
        };

        const getCategoryColor = function(category) {
            return category?.color || '#6B7280';
        };

        const getCategoryIcon = function(category) {
            const iconMap = {
                '餐饮': 'ri-restaurant-line',
                '交通': 'ri-bus-line',
                '购物': 'ri-shopping-cart-line',
                '娱乐': 'ri-game-line',
                '学习': 'ri-book-line',
                '生活用品': 'ri-home-line',
                '医疗': 'ri-hospital-line',
                '生活费': 'ri-wallet-line',
                '兼职': 'ri-briefcase-line',
                '奖学金': 'ri-award-line'
            };
            return iconMap[category?.name] || 'ri-price-tag-3-line';
        };

        const formatDate = function(date) {
            return new Date(date).toLocaleDateString('zh-CN');
        };

        const getTransactionType = function(item) {
            if (item.category_info && item.category_info.type) {
                return item.category_info.type;
            }
            return item.is_income ? 'income' : 'expense';
        };

        const getAmountPrefix = function(item) {
            const type = getTransactionType(item);
            return type === 'income' ? '+' : '-';
        };

        onMounted(function() {
            loadTransactions();
            loadCategories();
            
            window.addEventListener('quick-add', function() {
                showAddModal.value = true;
            });
        });

        return {
            transactions,
            categories,
            loading,
            filters,
            showAddModal,
            editingTransaction,
            transactionForm,
            filteredCategories,
            loadTransactions,
            saveTransaction,
            editTransaction,
            deleteTransaction,
            closeModal,
            getCategoryColor,
            getCategoryIcon,
            formatDate,
            getTransactionType,
            getAmountPrefix
        };
    }
};

// 分类管理组件
const Categories = {
    template: `
        <div>
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">分类管理</h3>
                    <button @click="showAddModal = true" class="btn btn-primary">
                        <i class="ri-add-line"></i> 新建分类
                    </button>
                </div>

                <!-- 分类类型切换 -->
                <div style="display: flex; gap: 12px; margin-bottom: 20px;">
                    <button 
                        @click="currentType = 'expense'"
                        class="btn"
                        :class="currentType === 'expense' ? 'btn-danger' : 'btn-outline'"
                    >
                        <i class="ri-arrow-up-circle-line"></i> 支出分类
                    </button>
                    <button 
                        @click="currentType = 'income'"
                        class="btn"
                        :class="currentType === 'income' ? 'btn-success' : 'btn-outline'"
                    >
                        <i class="ri-arrow-down-circle-line"></i> 收入分类
                    </button>
                </div>

                <!-- 分类列表 -->
                <div v-if="filteredCategories.length">
                    <div class="category-grid">
                        <div v-for="category in filteredCategories" :key="category.id" class="category-item">
                            <div class="category-icon" :style="{ background: category.color + '20', color: category.color }">
                                <i :class="category.icon || 'ri-price-tag-3-line'"></i>
                            </div>
                            <div class="category-info">
                                <h4>{{ category.name }}</h4>
                                <p>{{ category.type === 'income' ? '收入' : '支出' }}分类</p>
                                <div class="category-stats">
                                    <span>使用 {{ category.usage_count || 0 }} 次</span>
                                    <span>总计 ¥{{ category.total_amount || 0 }}</span>
                                </div>
                            </div>
                            <div class="category-actions">
                                <button @click="editCategory(category)" class="btn btn-outline" style="padding: 4px 8px; font-size: 12px;">
                                    <i class="ri-edit-line"></i>
                                </button>
                                <button 
                                    @click="deleteCategory(category.id)" 
                                    class="btn btn-outline" 
                                    style="padding: 4px 8px; font-size: 12px; margin-left: 4px;"
                                    :disabled="category.is_default"
                                >
                                    <i class="ri-delete-bin-line"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-else-if="!loading" class="empty-state">
                    <i class="ri-price-tag-3-line"></i>
                    <h3>暂无{{ currentType === 'income' ? '收入' : '支出' }}分类</h3>
                    <p>点击上方"新建分类"开始创建</p>
                </div>
                <div v-if="loading" class="loading">
                    <div class="spinner"></div>
                </div>
            </div>

            <!-- 添加/编辑分类模态框 -->
            <div class="modal" :class="{ show: showAddModal }">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">{{ editingCategory ? '编辑分类' : '新建分类' }}</h3>
                        <button @click="closeModal" class="modal-close">
                            <i class="ri-close-line"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form @submit.prevent="saveCategory">
                            <div class="form-group">
                                <label class="form-label">分类名称</label>
                                <input
                                    type="text"
                                    class="form-control"
                                    v-model="categoryForm.name"
                                    placeholder="请输入分类名称"
                                    required
                                >
                            </div>

                            <div class="form-group">
                                <label class="form-label">分类类型</label>
                                <div style="display: flex; gap: 12px;">
                                    <button
                                        type="button"
                                        @click="categoryForm.type = 'expense'"
                                        class="btn"
                                        :class="categoryForm.type === 'expense' ? 'btn-danger' : 'btn-outline'"
                                        style="flex: 1;"
                                    >
                                        <i class="ri-arrow-up-circle-line"></i> 支出
                                    </button>
                                    <button
                                        type="button"
                                        @click="categoryForm.type = 'income'"
                                        class="btn"
                                        :class="categoryForm.type === 'income' ? 'btn-success' : 'btn-outline'"
                                        style="flex: 1;"
                                    >
                                        <i class="ri-arrow-down-circle-line"></i> 收入
                                    </button>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">图标</label>
                                <div class="icon-grid">
                                    <button
                                        type="button"
                                        v-for="icon in availableIcons"
                                        :key="icon"
                                        @click="categoryForm.icon = icon"
                                        class="icon-btn"
                                        :class="{ active: categoryForm.icon === icon }"
                                    >
                                        <i :class="icon"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">颜色</label>
                                <div class="color-grid">
                                    <button
                                        type="button"
                                        v-for="color in availableColors"
                                        :key="color"
                                        @click="categoryForm.color = color"
                                        class="color-btn"
                                        :class="{ active: categoryForm.color === color }"
                                        :style="{ backgroundColor: color }"
                                    ></button>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">描述</label>
                                <textarea
                                    class="form-control"
                                    v-model="categoryForm.description"
                                    rows="3"
                                    placeholder="选填"
                                ></textarea>
                            </div>

                            <div style="display: flex; gap: 12px;">
                                <button type="button" @click="closeModal" class="btn btn-outline" style="flex: 1;">
                                    取消
                                </button>
                                <button type="submit" class="btn btn-primary" style="flex: 1;">
                                    保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const categories = ref([]);
        const loading = ref(false);
        const showAddModal = ref(false);
        const editingCategory = ref(null);
        const currentType = ref('expense');

        const categoryForm = reactive({
            name: '',
            type: 'expense',
            icon: 'ri-price-tag-3-line',
            color: '#6B7280',
            description: ''
        });

        const availableIcons = [
            'ri-restaurant-line',
            'ri-bus-line',
            'ri-shopping-cart-line',
            'ri-game-line',
            'ri-book-line',
            'ri-home-line',
            'ri-hospital-line',
            'ri-wallet-line',
            'ri-briefcase-line',
            'ri-award-line',
            'ri-car-line',
            'ri-phone-line',
            'ri-computer-line',
            'ri-gift-line',
            'ri-heart-line'
        ];

        const availableColors = [
            '#6B7280', '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
            '#8B5CF6', '#EC4899', '#F97316', '#84CC16', '#06B6D4'
        ];

        const filteredCategories = computed(function() {
            return categories.value.filter(function(cat) {
                return cat.type === currentType.value;
            });
        });

        const loadCategories = async function() {
            loading.value = true;
            try {
                const response = await api.get('/categories/');
                categories.value = response.data.results || [];
            } catch (error) {
                console.error('加载分类失败', error);
            } finally {
                loading.value = false;
            }
        };

        const saveCategory = async function() {
            try {
                if (editingCategory.value) {
                    await api.patch('/categories/' + editingCategory.value.id + '/', categoryForm);
                    alert('更新成功！');
                } else {
                    await api.post('/categories/', categoryForm);
                    alert('添加成功！');
                }

                closeModal();
                loadCategories();
            } catch (error) {
                alert('操作失败：' + (error.response?.data?.detail || '请重试'));
            }
        };

        const editCategory = function(category) {
            editingCategory.value = category;
            categoryForm.name = category.name;
            categoryForm.type = category.type;
            categoryForm.icon = category.icon || 'ri-price-tag-3-line';
            categoryForm.color = category.color || '#6B7280';
            categoryForm.description = category.description || '';
            showAddModal.value = true;
        };

        const deleteCategory = async function(id) {
            if (!confirm('确定要删除这个分类吗？')) return;

            try {
                await api.delete('/categories/' + id + '/');
                alert('删除成功！');
                loadCategories();
            } catch (error) {
                alert('删除失败：' + (error.response?.data?.detail || '请重试'));
            }
        };

        const closeModal = function() {
            showAddModal.value = false;
            editingCategory.value = null;
            categoryForm.name = '';
            categoryForm.type = 'expense';
            categoryForm.icon = 'ri-price-tag-3-line';
            categoryForm.color = '#6B7280';
            categoryForm.description = '';
        };

        onMounted(function() {
            loadCategories();
        });

        return {
            categories,
            loading,
            showAddModal,
            editingCategory,
            currentType,
            categoryForm,
            availableIcons,
            availableColors,
            filteredCategories,
            loadCategories,
            saveCategory,
            editCategory,
            deleteCategory,
            closeModal
        };
    }
};

// 预算管理组件
const Budgets = {
    template: `
        <div>
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">预算管理</h3>
                    <button @click="showAddModal = true" class="btn btn-primary">
                        <i class="ri-add-line"></i> 设置预算
                    </button>
                </div>

                <!-- 月份选择 -->
                <div style="display: flex; gap: 12px; margin-bottom: 20px; align-items: center;">
                    <label class="form-label" style="margin: 0;">选择月份：</label>
                    <input
                        type="month"
                        v-model="selectedMonth"
                        @change="loadBudgets"
                        class="form-control"
                        style="width: 200px;"
                    >
                </div>

                <!-- 总预算卡片 -->
                <div v-if="totalBudget" class="card" style="margin-bottom: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                    <div style="padding: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h3 style="margin: 0 0 8px 0; font-size: 16px; opacity: 0.9;">总预算</h3>
                                <div style="font-size: 32px; font-weight: bold;">¥{{ totalBudget.amount }}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 14px; opacity: 0.9;">已使用</div>
                                <div style="font-size: 24px; font-weight: bold;">¥{{ totalBudget.spent_amount }}</div>
                                <div style="font-size: 14px; margin-top: 4px;">剩余 ¥{{ totalBudget.remaining_amount }}</div>
                            </div>
                        </div>
                        <div style="margin-top: 16px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span>使用进度</span>
                                <span>{{ totalBudget.usage_percentage }}%</span>
                            </div>
                            <div style="background: rgba(255,255,255,0.3); border-radius: 8px; height: 8px; overflow: hidden;">
                                <div
                                    :style="{
                                        width: Math.min(totalBudget.usage_percentage, 100) + '%',
                                        height: '100%',
                                        background: totalBudget.is_exceeded ? '#ef4444' : totalBudget.is_alert ? '#f59e0b' : '#10b981',
                                        transition: 'width 0.3s'
                                    }"
                                ></div>
                            </div>
                        </div>
                        <div style="margin-top: 12px; display: flex; gap: 8px;">
                            <button @click="editBudget(totalBudget)" class="btn btn-outline" style="background: rgba(255,255,255,0.2); border-color: white; color: white; padding: 6px 12px; font-size: 12px;">
                                <i class="ri-edit-line"></i> 编辑
                            </button>
                            <button @click="deleteBudget(totalBudget.id)" class="btn btn-outline" style="background: rgba(255,255,255,0.2); border-color: white; color: white; padding: 6px 12px; font-size: 12px;">
                                <i class="ri-delete-bin-line"></i> 删除
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 分类预算列表 -->
                <div v-if="categoryBudgets.length">
                    <h4 style="margin: 20px 0 12px 0; color: #6B7280;">分类预算</h4>
                    <div class="budget-grid">
                        <div v-for="budget in categoryBudgets" :key="budget.id" class="budget-card">
                            <div class="budget-header">
                                <div class="budget-icon" :style="{ background: budget.category_info?.color + '20', color: budget.category_info?.color }">
                                    <i :class="budget.category_info?.icon || 'ri-price-tag-3-line'"></i>
                                </div>
                                <div class="budget-info">
                                    <h4>{{ budget.category_info?.name || '未分类' }}</h4>
                                    <p>预算 ¥{{ budget.amount }}</p>
                                </div>
                            </div>
                            <div class="budget-stats">
                                <div class="stat-row">
                                    <span>已使用</span>
                                    <span class="stat-value">¥{{ budget.spent_amount }}</span>
                                </div>
                                <div class="stat-row">
                                    <span>剩余</span>
                                    <span class="stat-value" :class="{ 'text-danger': budget.is_exceeded }">
                                        ¥{{ budget.remaining_amount }}
                                    </span>
                                </div>
                            </div>
                            <div class="budget-progress">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
                                    <span>使用率</span>
                                    <span :class="{
                                        'text-danger': budget.is_exceeded,
                                        'text-warning': budget.is_alert && !budget.is_exceeded
                                    }">
                                        {{ budget.usage_percentage }}%
                                        <i v-if="budget.is_exceeded" class="ri-error-warning-line"></i>
                                        <i v-else-if="budget.is_alert" class="ri-alert-line"></i>
                                    </span>
                                </div>
                                <div class="progress-bar">
                                    <div
                                        class="progress-fill"
                                        :class="{
                                            'progress-danger': budget.is_exceeded,
                                            'progress-warning': budget.is_alert && !budget.is_exceeded,
                                            'progress-success': !budget.is_alert
                                        }"
                                        :style="{ width: Math.min(budget.usage_percentage, 100) + '%' }"
                                    ></div>
                                </div>
                            </div>
                            <div class="budget-actions">
                                <button @click="editBudget(budget)" class="btn btn-outline" style="padding: 4px 8px; font-size: 12px;">
                                    <i class="ri-edit-line"></i> 编辑
                                </button>
                                <button @click="copyToNextMonth(budget.id)" class="btn btn-outline" style="padding: 4px 8px; font-size: 12px;">
                                    <i class="ri-file-copy-line"></i> 复制到下月
                                </button>
                                <button @click="deleteBudget(budget.id)" class="btn btn-outline" style="padding: 4px 8px; font-size: 12px;">
                                    <i class="ri-delete-bin-line"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-else-if="!totalBudget && !loading" class="empty-state">
                    <i class="ri-calculator-line"></i>
                    <h3>暂无预算设置</h3>
                    <p>点击"设置预算"开始管理你的预算</p>
                </div>
                <div v-if="loading" class="loading">
                    <div class="spinner"></div>
                </div>
            </div>

            <!-- 添加/编辑预算模态框 -->
            <div class="modal" :class="{ show: showAddModal }">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">{{ editingBudget ? '编辑预算' : '设置预算' }}</h3>
                        <button @click="closeModal" class="modal-close">
                            <i class="ri-close-line"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form @submit.prevent="saveBudget">
                            <div class="form-group">
                                <label class="form-label">预算类型</label>
                                <div style="display: flex; gap: 12px;">
                                    <button
                                        type="button"
                                        @click="budgetForm.category = null"
                                        class="btn"
                                        :class="!budgetForm.category ? 'btn-primary' : 'btn-outline'"
                                        style="flex: 1;"
                                    >
                                        <i class="ri-wallet-line"></i> 总预算
                                    </button>
                                    <button
                                        type="button"
                                        @click="showCategorySelect = true"
                                        class="btn"
                                        :class="budgetForm.category ? 'btn-primary' : 'btn-outline'"
                                        style="flex: 1;"
                                    >
                                        <i class="ri-price-tag-3-line"></i> 分类预算
                                    </button>
                                </div>
                            </div>

                            <div class="form-group" v-if="showCategorySelect || budgetForm.category">
                                <label class="form-label">选择分类（仅支出分类）</label>
                                <select v-model="budgetForm.category" class="form-control">
                                    <option value="">请选择分类</option>
                                    <option
                                        v-for="cat in expenseCategories"
                                        :key="cat.id"
                                        :value="cat.id"
                                    >
                                        {{ cat.name }}
                                    </option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label">年月</label>
                                <input
                                    type="month"
                                    class="form-control"
                                    v-model="budgetForm.year_month"
                                    required
                                >
                            </div>

                            <div class="form-group">
                                <label class="form-label">预算金额</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    class="form-control"
                                    v-model="budgetForm.amount"
                                    placeholder="0.00"
                                    required
                                >
                            </div>

                            <div class="form-group">
                                <label class="form-label">预警阈值（{{ budgetForm.alert_threshold }}%）</label>
                                <input
                                    type="range"
                                    class="form-range"
                                    v-model="budgetForm.alert_threshold"
                                    min="50"
                                    max="100"
                                    step="5"
                                >
                                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #6B7280; margin-top: 4px;">
                                    <span>50%</span>
                                    <span>75%</span>
                                    <span>100%</span>
                                </div>
                            </div>

                            <div style="display: flex; gap: 12px;">
                                <button type="button" @click="closeModal" class="btn btn-outline" style="flex: 1;">
                                    取消
                                </button>
                                <button type="submit" class="btn btn-primary" style="flex: 1;">
                                    保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const budgets = ref([]);
        const categories = ref([]);
        const loading = ref(false);
        const showAddModal = ref(false);
        const editingBudget = ref(null);
        const showCategorySelect = ref(false);
        const selectedMonth = ref(new Date().toISOString().slice(0, 7));

        const budgetForm = reactive({
            year_month: new Date().toISOString().slice(0, 7),
            amount: '',
            category: null,
            alert_threshold: 80
        });

        const totalBudget = computed(function() {
            return budgets.value.find(function(b) { return !b.category; });
        });

        const categoryBudgets = computed(function() {
            return budgets.value.filter(function(b) { return b.category; });
        });

        const expenseCategories = computed(function() {
            return categories.value.filter(function(cat) {
                return cat.type === 'expense';
            });
        });

        const loadBudgets = async function() {
            loading.value = true;
            try {
                const response = await api.get('/budgets/', {
                    params: { year_month: selectedMonth.value }
                });
                budgets.value = response.data.results || [];
            } catch (error) {
                console.error('加载预算失败', error);
            } finally {
                loading.value = false;
            }
        };

        const loadCategories = async function() {
            try {
                const response = await api.get('/categories/');
                categories.value = response.data.results || [];
            } catch (error) {
                console.error('加载分类失败', error);
            }
        };

        const saveBudget = async function() {
            try {
                const data = {
                    year_month: budgetForm.year_month,
                    amount: budgetForm.amount,
                    category: budgetForm.category || null,
                    alert_threshold: budgetForm.alert_threshold
                };

                if (editingBudget.value) {
                    await api.patch('/budgets/' + editingBudget.value.id + '/', data);
                    alert('更新成功！');
                } else {
                    await api.post('/budgets/', data);
                    alert('添加成功！');
                }

                closeModal();
                loadBudgets();
            } catch (error) {
                const errorMsg = error.response?.data?.detail ||
                                error.response?.data?.year_month?.[0] ||
                                error.response?.data?.category?.[0] ||
                                '操作失败，请重试';
                alert(errorMsg);
            }
        };

        const editBudget = function(budget) {
            editingBudget.value = budget;
            budgetForm.year_month = budget.year_month;
            budgetForm.amount = budget.amount;
            budgetForm.category = budget.category;
            budgetForm.alert_threshold = budget.alert_threshold;
            showCategorySelect.value = !!budget.category;
            showAddModal.value = true;
        };

        const deleteBudget = async function(id) {
            if (!confirm('确定要删除这个预算吗？')) return;

            try {
                await api.delete('/budgets/' + id + '/');
                alert('删除成功！');
                loadBudgets();
            } catch (error) {
                alert('删除失败');
            }
        };

        const copyToNextMonth = async function(id) {
            if (!confirm('确定要复制到下个月吗？')) return;

            try {
                await api.post('/budgets/' + id + '/copy_to_next_month/');
                alert('复制成功！');
                loadBudgets();
            } catch (error) {
                alert(error.response?.data?.detail || '复制失败');
            }
        };

        const closeModal = function() {
            showAddModal.value = false;
            editingBudget.value = null;
            showCategorySelect.value = false;
            budgetForm.year_month = new Date().toISOString().slice(0, 7);
            budgetForm.amount = '';
            budgetForm.category = null;
            budgetForm.alert_threshold = 80;
        };

        onMounted(function() {
            loadBudgets();
            loadCategories();
        });

        return {
            budgets,
            categories,
            loading,
            showAddModal,
            editingBudget,
            showCategorySelect,
            selectedMonth,
            budgetForm,
            totalBudget,
            categoryBudgets,
            expenseCategories,
            loadBudgets,
            saveBudget,
            editBudget,
            deleteBudget,
            copyToNextMonth,
            closeModal
        };
    }
};

// 报表组件
const Reports = {
    template: `
        <div>
            <h2 style="margin: 20px 0">数据报表</h2>

            <!-- 报表类型切换 -->
            <div class="card" style="margin-bottom: 20px;">
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <button
                        @click="reportType = 'monthly'"
                        class="btn"
                        :class="reportType === 'monthly' ? 'btn-primary' : 'btn-outline'"
                    >
                        <i class="ri-calendar-line"></i> 月度报告
                    </button>
                    <button
                        @click="reportType = 'yearly'"
                        class="btn"
                        :class="reportType === 'yearly' ? 'btn-primary' : 'btn-outline'"
                    >
                        <i class="ri-calendar-2-line"></i> 年度报告
                    </button>
                    <button
                        @click="reportType = 'expense'"
                        class="btn"
                        :class="reportType === 'expense' ? 'btn-primary' : 'btn-outline'"
                    >
                        <i class="ri-pie-chart-line"></i> 支出分析
                    </button>
                    <button
                        @click="reportType = 'trend'"
                        class="btn"
                        :class="reportType === 'trend' ? 'btn-primary' : 'btn-outline'"
                    >
                        <i class="ri-line-chart-line"></i> 趋势分析
                    </button>
                </div>
            </div>

            <!-- 月度报告 -->
            <div v-if="reportType === 'monthly'">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">月度报告</h3>
                        <input
                            type="month"
                            v-model="selectedMonth"
                            @change="loadMonthlyReport"
                            class="form-control"
                            style="width: 200px;"
                        >
                    </div>

                    <div v-if="monthlyReport">
                        <!-- 收支概览 -->
                        <div class="dashboard-grid" style="margin-bottom: 20px;">
                            <div class="stat-card">
                                <div class="stat-icon income">
                                    <i class="ri-arrow-down-circle-line"></i>
                                </div>
                                <div class="stat-label">总收入</div>
                                <div class="stat-value">¥{{ monthlyReport.income_total || '0.00' }}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon expense">
                                    <i class="ri-arrow-up-circle-line"></i>
                                </div>
                                <div class="stat-label">总支出</div>
                                <div class="stat-value">¥{{ monthlyReport.expense_total || '0.00' }}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon balance">
                                    <i class="ri-wallet-line"></i>
                                </div>
                                <div class="stat-label">日均支出</div>
                                <div class="stat-value">¥{{ monthlyReport.daily_average_expense?.toFixed(2) || '0.00' }}</div>
                            </div>
                        </div>

                        <!-- 支出分类明细 -->
                        <h4 style="margin: 24px 0 12px 0;">支出分类明细</h4>
                        <div v-if="monthlyReport.expense_detail?.length">
                            <div v-for="item in monthlyReport.expense_detail" :key="item.category__id"
                                style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div style="width: 12px; height: 12px; border-radius: 50%;" :style="{ background: item.category__color }"></div>
                                    <span style="font-weight: 500;">{{ item.category__name }}</span>
                                    <span style="font-size: 12px; color: var(--text-secondary);">{{ item.count }} 笔</span>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 600; color: var(--danger-color);">¥{{ item.total }}</div>
                                    <div style="font-size: 12px; color: var(--text-secondary);">平均 ¥{{ item.avg?.toFixed(2) }}</div>
                                </div>
                            </div>
                        </div>
                        <div v-else class="empty-state">
                            <p>暂无支出数据</p>
                        </div>

                        <!-- 收入分类明细 -->
                        <h4 style="margin: 24px 0 12px 0;">收入分类明细</h4>
                        <div v-if="monthlyReport.income_detail?.length">
                            <div v-for="item in monthlyReport.income_detail" :key="item.category__id"
                                style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <div style="width: 12px; height: 12px; border-radius: 50%;" :style="{ background: item.category__color }"></div>
                                    <span style="font-weight: 500;">{{ item.category__name }}</span>
                                    <span style="font-size: 12px; color: var(--text-secondary);">{{ item.count }} 笔</span>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-weight: 600; color: var(--success-color);">¥{{ item.total }}</div>
                                    <div style="font-size: 12px; color: var(--text-secondary);">平均 ¥{{ item.avg?.toFixed(2) }}</div>
                                </div>
                            </div>
                        </div>
                        <div v-else class="empty-state">
                            <p>暂无收入数据</p>
                        </div>

                        <!-- 支出分布饼图 -->
                        <h4 style="margin: 24px 0 12px 0;">支出分布</h4>
                        <div v-if="monthlyReport.expense_detail?.length">
                            <div ref="monthlyExpenseChart" style="height: 350px;"></div>
                        </div>
                        <div v-else class="empty-state">
                            <p>暂无支出数据</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 年度报告 -->
            <div v-if="reportType === 'yearly'">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">年度报告</h3>
                        <select v-model="selectedYear" @change="loadYearlyReport" class="form-control" style="width: 150px;">
                            <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}年</option>
                        </select>
                    </div>

                    <div v-if="yearlyReport">
                        <!-- 年度概览 -->
                        <div class="dashboard-grid" style="margin-bottom: 20px;">
                            <div class="stat-card">
                                <div class="stat-icon income">
                                    <i class="ri-arrow-down-circle-line"></i>
                                </div>
                                <div class="stat-label">年度收入</div>
                                <div class="stat-value">¥{{ yearlyReport.total_income || '0.00' }}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon expense">
                                    <i class="ri-arrow-up-circle-line"></i>
                                </div>
                                <div class="stat-label">年度支出</div>
                                <div class="stat-value">¥{{ yearlyReport.total_expense || '0.00' }}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon balance">
                                    <i class="ri-wallet-line"></i>
                                </div>
                                <div class="stat-label">年度结余</div>
                                <div class="stat-value">¥{{ yearlyReport.balance || '0.00' }}</div>
                            </div>
                        </div>

                        <!-- 月度趋势图表 -->
                        <h4 style="margin: 24px 0 12px 0;">月度收支趋势</h4>
                        <div ref="yearlyChart" style="height: 300px;"></div>
                    </div>
                </div>
            </div>

            <!-- 支出分析 -->
            <div v-if="reportType === 'expense'">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">支出分析</h3>
                        <div style="display: flex; gap: 12px;">
                            <input
                                type="date"
                                v-model="expenseStartDate"
                                @change="loadExpenseAnalysis"
                                class="form-control"
                                style="width: 150px;"
                            >
                            <input
                                type="date"
                                v-model="expenseEndDate"
                                @change="loadExpenseAnalysis"
                                class="form-control"
                                style="width: 150px;"
                            >
                        </div>
                    </div>

                    <div v-if="expenseAnalysis">
                        <!-- 支出概览 -->
                        <div class="dashboard-grid" style="margin-bottom: 20px;">
                            <div class="stat-card">
                                <div class="stat-icon expense">
                                    <i class="ri-money-dollar-circle-line"></i>
                                </div>
                                <div class="stat-label">总支出</div>
                                <div class="stat-value">¥{{ expenseAnalysis.total_expense || '0.00' }}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon">
                                    <i class="ri-calendar-check-line"></i>
                                </div>
                                <div class="stat-label">日均支出</div>
                                <div class="stat-value">¥{{ expenseAnalysis.daily_average?.toFixed(2) || '0.00' }}</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-icon warning">
                                    <i class="ri-arrow-up-line"></i>
                                </div>
                                <div class="stat-label">最大单笔</div>
                                <div class="stat-value">¥{{ expenseAnalysis.max_expense?.amount || '0.00' }}</div>
                            </div>
                        </div>

                        <!-- 支出分类饼图 -->
                        <h4 style="margin: 24px 0 12px 0;">支出分类占比</h4>
                        <div ref="expenseChart" style="height: 350px;"></div>
                    </div>
                </div>
            </div>

            <!-- 趋势分析 -->
            <div v-if="reportType === 'trend'">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">趋势分析</h3>
                        <select v-model="trendMonths" @change="loadTrendAnalysis" class="form-control" style="width: 150px;">
                            <option value="6">最近6个月</option>
                            <option value="12">最近12个月</option>
                            <option value="24">最近24个月</option>
                        </select>
                    </div>

                    <div v-if="trendAnalysis">
                        <!-- 趋势图表 -->
                        <div ref="trendChart" style="height: 400px;"></div>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const reportType = ref('monthly');
        const selectedMonth = ref(new Date().toISOString().slice(0, 7));
        const selectedYear = ref(new Date().getFullYear());
        const expenseStartDate = ref(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
        const expenseEndDate = ref(new Date().toISOString().slice(0, 10));
        const trendMonths = ref(12);

        const monthlyReport = ref(null);
        const yearlyReport = ref(null);
        const expenseAnalysis = ref(null);
        const trendAnalysis = ref(null);

        const monthlyExpenseChart = ref(null);
        const yearlyChart = ref(null);
        const expenseChart = ref(null);
        const trendChart = ref(null);

        const yearOptions = computed(function() {
            const currentYear = new Date().getFullYear();
            const years = [];
            for (let i = 0; i < 5; i++) {
                years.push(currentYear - i);
            }
            return years;
        });

        const loadMonthlyReport = async function() {
            try {
                const response = await api.get('/reports/monthly/', {
                    params: { month: selectedMonth.value }
                });
                const data = response.data;

                monthlyReport.value = {
                    ...data,
                    income_total: data.income_detail.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(2),
                    expense_total: data.expense_detail.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(2)
                };

                // 绘制月度支出饼图
                setTimeout(function() {
                    if (monthlyExpenseChart.value && data.expense_detail.length > 0) {
                        const chart = echarts.init(monthlyExpenseChart.value);
                        const total = data.expense_detail.reduce((sum, item) => sum + parseFloat(item.total), 0);

                        chart.setOption({
                            tooltip: {
                                trigger: 'item',
                                formatter: function(params) {
                                    return params.name + '<br/>金额: ¥' + params.value + '<br/>占比: ' + params.percent + '%';
                                }
                            },
                            legend: {
                                orient: 'vertical',
                                left: 'left',
                                top: 'middle'
                            },
                            series: [
                                {
                                    name: '支出分布',
                                    type: 'pie',
                                    radius: ['40%', '70%'],
                                    center: ['60%', '50%'],
                                    avoidLabelOverlap: false,
                                    label: {
                                        show: true,
                                        formatter: function(params) {
                                            return params.name + '\n¥' + params.value + '\n(' + params.percent + '%)';
                                        }
                                    },
                                    emphasis: {
                                        label: {
                                            show: true,
                                            fontSize: 14,
                                            fontWeight: 'bold'
                                        }
                                    },
                                    labelLine: {
                                        show: true
                                    },
                                    data: data.expense_detail.map(function(item) {
                                        return {
                                            value: parseFloat(item.total).toFixed(2),
                                            name: item.category__name,
                                            itemStyle: { color: item.category__color || '#6B7280' }
                                        };
                                    })
                                }
                            ]
                        });
                    }
                }, 100);
            } catch (error) {
                console.error('加载月度报告失败', error);
            }
        };

        const loadYearlyReport = async function() {
            try {
                const response = await api.get('/reports/yearly/', {
                    params: { year: selectedYear.value }
                });
                yearlyReport.value = response.data;

                // 绘制图表
                setTimeout(function() {
                    if (yearlyChart.value) {
                        const chart = echarts.init(yearlyChart.value);
                        chart.setOption({
                            tooltip: {
                                trigger: 'axis',
                                axisPointer: {
                                    type: 'cross',
                                    crossStyle: {
                                        color: '#999'
                                    }
                                }
                            },
                            legend: {
                                data: ['收入', '支出', '结余'],
                                top: 10
                            },
                            grid: {
                                left: '3%',
                                right: '4%',
                                bottom: '3%',
                                containLabel: true
                            },
                            xAxis: {
                                type: 'category',
                                data: yearlyReport.value.monthly_trend.map(function(item) { return item.month; }),
                                axisPointer: {
                                    type: 'shadow'
                                }
                            },
                            yAxis: {
                                type: 'value',
                                name: '金额（¥）',
                                axisLabel: {
                                    formatter: '¥{value}'
                                }
                            },
                            series: [
                                {
                                    name: '收入',
                                    type: 'bar',
                                    data: yearlyReport.value.monthly_trend.map(function(item) { return item.income; }),
                                    itemStyle: {
                                        color: '#10B981',
                                        borderRadius: [5, 5, 0, 0]
                                    }
                                },
                                {
                                    name: '支出',
                                    type: 'bar',
                                    data: yearlyReport.value.monthly_trend.map(function(item) { return item.expense; }),
                                    itemStyle: {
                                        color: '#EF4444',
                                        borderRadius: [5, 5, 0, 0]
                                    }
                                },
                                {
                                    name: '结余',
                                    type: 'line',
                                    yAxisIndex: 0,
                                    data: yearlyReport.value.monthly_trend.map(function(item) { return item.balance; }),
                                    itemStyle: { color: '#4F46E5' },
                                    lineStyle: { width: 3 },
                                    smooth: true,
                                    symbolSize: 8
                                }
                            ]
                        });
                    }
                }, 100);
            } catch (error) {
                console.error('加载年度报告失败', error);
            }
        };

        const loadExpenseAnalysis = async function() {
            try {
                const response = await api.get('/reports/expense-analysis/', {
                    params: {
                        start_date: expenseStartDate.value,
                        end_date: expenseEndDate.value
                    }
                });
                expenseAnalysis.value = response.data;

                // 绘制饼图
                setTimeout(function() {
                    if (expenseChart.value && expenseAnalysis.value.top_categories.length > 0) {
                        const chart = echarts.init(expenseChart.value);
                        console.log('支出分析数据:', expenseAnalysis.value.top_categories);
                        const chartData = expenseAnalysis.value.top_categories.map(function(item) {
                            return {
                                value: parseFloat(item.total),
                                name: item.category__name || '未分类',
                                itemStyle: { color: item.category__color || '#6B7280' }
                            };
                        });
                        console.log('图表数据:', chartData);

                        chart.setOption({
                            tooltip: {
                                trigger: 'item',
                                formatter: function(params) {
                                    return params.name + '<br/>金额: ¥' + params.value.toFixed(2) + '<br/>占比: ' + params.percent.toFixed(2) + '%';
                                }
                            },
                            legend: {
                                orient: 'vertical',
                                left: 'left',
                                top: 'middle',
                                textStyle: {
                                    fontSize: 12
                                },
                                data: chartData.map(function(item) { return item.name; })
                            },
                            series: [
                                {
                                    name: '支出分类',
                                    type: 'pie',
                                    radius: ['35%', '65%'],
                                    center: ['60%', '50%'],
                                    avoidLabelOverlap: false,
                                    itemStyle: {
                                        borderRadius: 8,
                                        borderColor: '#fff',
                                        borderWidth: 2
                                    },
                                    label: {
                                        show: true,
                                        formatter: function(params) {
                                            return params.name + '\n¥' + params.value.toFixed(2) + '\n(' + params.percent.toFixed(1) + '%)';
                                        },
                                        fontSize: 12
                                    },
                                    emphasis: {
                                        label: {
                                            show: true,
                                            fontSize: 14,
                                            fontWeight: 'bold'
                                        },
                                        itemStyle: {
                                            shadowBlur: 10,
                                            shadowOffsetX: 0,
                                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                                        }
                                    },
                                    labelLine: {
                                        show: true,
                                        length: 15,
                                        length2: 10
                                    },
                                    data: chartData
                                }
                            ]
                        });
                    }
                }, 100);
            } catch (error) {
                console.error('加载支出分析失败', error);
            }
        };

        const loadTrendAnalysis = async function() {
            try {
                const response = await api.get('/reports/trend/', {
                    params: { months: trendMonths.value }
                });
                trendAnalysis.value = response.data;

                // 绘制趋势图
                setTimeout(function() {
                    if (trendChart.value) {
                        const chart = echarts.init(trendChart.value);
                        chart.setOption({
                            tooltip: {
                                trigger: 'axis',
                                axisPointer: {
                                    type: 'cross',
                                    label: {
                                        backgroundColor: '#6a7985'
                                    }
                                }
                            },
                            legend: {
                                data: ['收入', '支出', '结余'],
                                top: 10
                            },
                            grid: {
                                left: '3%',
                                right: '4%',
                                bottom: '3%',
                                containLabel: true
                            },
                            xAxis: {
                                type: 'category',
                                boundaryGap: false,
                                data: trendAnalysis.value.trend.map(function(item) { return item.month; })
                            },
                            yAxis: {
                                type: 'value',
                                name: '金额（¥）',
                                axisLabel: {
                                    formatter: '¥{value}'
                                }
                            },
                            series: [
                                {
                                    name: '收入',
                                    type: 'line',
                                    smooth: true,
                                    data: trendAnalysis.value.trend.map(function(item) { return item.income; }),
                                    itemStyle: { color: '#10B981' },
                                    lineStyle: { width: 3 },
                                    areaStyle: {
                                        color: {
                                            type: 'linear',
                                            x: 0,
                                            y: 0,
                                            x2: 0,
                                            y2: 1,
                                            colorStops: [{
                                                offset: 0, color: 'rgba(16, 185, 129, 0.3)'
                                            }, {
                                                offset: 1, color: 'rgba(16, 185, 129, 0.05)'
                                            }]
                                        }
                                    },
                                    symbolSize: 8
                                },
                                {
                                    name: '支出',
                                    type: 'line',
                                    smooth: true,
                                    data: trendAnalysis.value.trend.map(function(item) { return item.expense; }),
                                    itemStyle: { color: '#EF4444' },
                                    lineStyle: { width: 3 },
                                    areaStyle: {
                                        color: {
                                            type: 'linear',
                                            x: 0,
                                            y: 0,
                                            x2: 0,
                                            y2: 1,
                                            colorStops: [{
                                                offset: 0, color: 'rgba(239, 68, 68, 0.3)'
                                            }, {
                                                offset: 1, color: 'rgba(239, 68, 68, 0.05)'
                                            }]
                                        }
                                    },
                                    symbolSize: 8
                                },
                                {
                                    name: '结余',
                                    type: 'line',
                                    smooth: true,
                                    data: trendAnalysis.value.trend.map(function(item) { return item.balance; }),
                                    itemStyle: { color: '#4F46E5' },
                                    lineStyle: { width: 2, type: 'dashed' },
                                    symbolSize: 6
                                }
                            ]
                        });
                    }
                }, 100);
            } catch (error) {
                console.error('加载趋势分析失败', error);
            }
        };

        onMounted(function() {
            loadMonthlyReport();
        });

        return {
            reportType,
            selectedMonth,
            selectedYear,
            expenseStartDate,
            expenseEndDate,
            trendMonths,
            monthlyReport,
            yearlyReport,
            expenseAnalysis,
            trendAnalysis,
            monthlyExpenseChart,
            yearlyChart,
            expenseChart,
            trendChart,
            yearOptions,
            loadMonthlyReport,
            loadYearlyReport,
            loadExpenseAnalysis,
            loadTrendAnalysis
        };
    }
};

// 主应用布局组件
const AppLayout = {
    template: `
        <div>
            <nav class="navbar">
                <div class="container navbar-content">
                    <a href="#/" class="navbar-brand">
                        <i class="ri-wallet-3-fill"></i>
                        C-Money
                    </a>

                    <ul class="navbar-menu">
                        <li>
                            <router-link to="/" :class="{ active: $route.path === '/' }">
                                <i class="ri-dashboard-line"></i> 仪表盘
                            </router-link>
                        </li>
                        <li>
                            <router-link to="/transactions" :class="{ active: $route.path === '/transactions' }">
                                <i class="ri-file-list-3-line"></i> 账单
                            </router-link>
                        </li>
                        <li>
                            <router-link to="/categories" :class="{ active: $route.path === '/categories' }">
                                <i class="ri-price-tag-3-line"></i> 分类
                            </router-link>
                        </li>
                        <li>
                            <router-link to="/budgets" :class="{ active: $route.path === '/budgets' }">
                                <i class="ri-calculator-line"></i> 预算
                            </router-link>
                        </li>
                        <li>
                            <router-link to="/reports" :class="{ active: $route.path === '/reports' }">
                                <i class="ri-bar-chart-box-line"></i> 报表
                            </router-link>
                        </li>
                    </ul>

                    <div class="navbar-user">
                        <div class="user-avatar">
                            {{ username[0]?.toUpperCase() }}
                        </div>
                        <button @click="logout" class="btn btn-outline">
                            <i class="ri-logout-box-line"></i> 退出
                        </button>
                    </div>
                </div>
            </nav>

            <div class="container">
                <router-view></router-view>
            </div>

            <!-- 快速记账按钮 -->
            <button @click="quickAdd" class="fab">
                <i class="ri-add-line"></i>
            </button>
        </div>
    `,
    setup() {
        const username = localStorage.getItem('username') || 'User';

        const logout = function() {
            if (confirm('确定要退出登录吗？')) {
                localStorage.clear();
                router.push('/login');
            }
        };

        const quickAdd = function() {
            router.push('/transactions');
            setTimeout(function() {
                const event = new CustomEvent('quick-add');
                window.dispatchEvent(event);
            }, 100);
        };

        return {
            username,
            logout,
            quickAdd
        };
    }
};

// 路由配置
const routes = [
    {
        path: '/',
        component: AppLayout,
        children: [
            { path: '', component: Dashboard },
            { path: 'transactions', component: Transactions },
            { path: 'categories', component: Categories },
            { path: 'budgets', component: Budgets },
            { path: 'reports', component: Reports }
        ],
        beforeEnter: function(to, from, next) {
            const token = localStorage.getItem('access_token');
            if (!token) {
                next('/login');
            } else {
                next();
            }
        }
    },
    { path: '/login', component: Login },
    { path: '/register', component: Register }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

// 创建应用
const app = createApp({
    template: '<router-view></router-view>',
    setup: function() {
        return {};
    }
});

app.use(router);
app.mount('#app');