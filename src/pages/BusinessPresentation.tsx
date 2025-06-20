
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, Users, Video, Timer, Target, Shield, Zap, Eye, TrendingUp,
  PlayCircle, UserCheck, Database, Smartphone, Globe, Check, Crown, Star,
  Share2, Lightbulb, Building, School, ArrowRight, ChevronLeft, ChevronRight,
  Trophy, Activity, Mic, Calendar, Bell, FileText, PieChart, Map, LineChart,
  Camera, Clock, MessageSquare, Headphones, Radar, Hash, BarChart, TrendingDown,
  Award, Settings, Lock, Flag, ArrowLeft, Fullscreen
} from 'lucide-react';

const BusinessPresentation: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Navigation functions
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevSlide();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextSlide();
      if (e.key === 'f' || e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const slides = [
    // Slide 1: Enhanced Title
    {
      id: 'title',
      title: 'فوتبول أناليتيكس برو: الربحة تتبنى هنا',
      subtitle: 'سلاحك السري باش تسيطر على الفوت الدزيري',
      content: (
        <div className="h-full flex items-center justify-center">
          <div className="text-center space-y-12 w-full max-w-6xl">
            <div className="relative">
              <div className="w-40 h-40 bg-gradient-to-br from-green-600 via-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl animate-pulse">
                <Trophy className="h-20 w-20 text-white" />
              </div>
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                <Star className="h-8 w-8 text-yellow-800" />
              </div>
            </div>
            <div className="space-y-6">
              <h1 className="text-7xl font-black bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                FootballAnalytics Pro
              </h1>
              <p className="text-3xl text-slate-700 max-w-5xl mx-auto font-medium leading-relaxed">
                مد للنادي ديالك أفضلية حاسمة مع المنصة لي ترجع كل ماتش درس في التكتيك
              </p>
              <div className="flex justify-center">
                <Badge className="bg-gradient-to-r from-green-100 to-blue-100 text-green-800 border-green-200 px-12 py-4 text-xl font-bold rounded-full shadow-lg">
                  عرض تقديمي لنوادي الجزائر
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 2: Enhanced Problem Statement
    {
      id: 'problem',
      title: 'المشاكل تاع كرة القدم في الجزائر اليوم',
      subtitle: 'العقبات لي تحبس الأداء والتطور ديالك',
      content: (
        <div className="h-full flex items-center">
          <div className="grid grid-cols-2 gap-16 w-full">
            <div className="space-y-8">
              <h3 className="text-4xl font-bold text-slate-900 text-right mb-8">المشاكل الشائعة</h3>
              <div className="space-y-6">
                {[
                  { icon: <Timer className="h-10 w-10 text-red-500" />, title: "التحليل باليد: يشد الوقت وفيه غلطات", desc: "ساعات وساعات تضيع في إعادة الماتش" },
                  { icon: <Database className="h-10 w-10 text-orange-500" />, title: "البيانات مبعثرة", desc: "الإحصائيات، الفيديوهات، التقارير... كل حاجة في بلاصة" },
                  { icon: <Users className="h-10 w-10 text-yellow-500" />, title: "صعوبة اكتشاف المواهب", desc: "صعيب تتبع تطور اللاعبين الشبان بموضوعية" },
                  { icon: <Video className="h-10 w-10 text-blue-500" />, title: "تحليل الفيديو غير متزامن", desc: "ماكانش ربط مباشر بين البيانات ولقطات الفيديو" }
                ].map((problem, idx) => (
                  <div key={problem.title} className="flex gap-6 p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-r-4 border-red-400 hover:shadow-2xl transition-all duration-300">
                    <div className="flex-shrink-0 p-4 bg-gray-50 rounded-xl shadow-inner">{problem.icon}</div>
                    <div className="text-right flex-1">
                      <h4 className="text-xl font-bold text-slate-900 mb-3">{problem.title}</h4>
                      <p className="text-slate-600 text-lg">{problem.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-8">
              <h3 className="text-4xl font-bold text-slate-900 text-right mb-8">التأثير على الأداء</h3>
              <div className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-12 rounded-3xl border-2 border-red-200 shadow-2xl">
                <div className="space-y-12 text-center">
                  <div className="space-y-4">
                    <div className="text-7xl font-black text-red-600 mb-4">-40%</div>
                    <p className="text-2xl font-semibold text-slate-700">نقص في فعالية التحليل</p>
                  </div>
                  <div className="space-y-4">
                    <div className="text-7xl font-black text-orange-600 mb-4">+200%</div>
                    <p className="text-2xl font-semibold text-slate-700">الوقت اللازم للتقارير</p>
                  </div>
                  <div className="space-y-4">
                    <div className="text-7xl font-black text-yellow-600 mb-4">70%</div>
                    <p className="text-2xl font-semibold text-slate-700">من الأفكار تضيع</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 3: Enhanced Solution Overview
    {
      id: 'solution',
      title: 'الحل ديالنا: فوتبول أناليتيكس برو',
      subtitle: 'منصة موحدة تحدث ثورة في تحليل كرة القدم',
      content: (
        <div className="h-full flex items-center justify-center">
          <div className="space-y-16 w-full">
            <div className="grid grid-cols-3 gap-12">
              {[
                { icon: <Target className="h-16 w-16 text-blue-600" />, title: "تسجيل دقيق", desc: "واجهة 'بيانو' محسّنة لتتبع الأحداث في الوقت الفعلي بدقة فائقة", gradient: "from-blue-500/20 to-indigo-500/20", border: "border-blue-200" },
                { icon: <Video className="h-16 w-16 text-indigo-600" />, title: "تحليل فيديو متزامن", desc: "ربط تلقائي بين البيانات ولقطات الفيديو للحصول على رؤى بصرية", gradient: "from-indigo-500/20 to-purple-500/20", border: "border-indigo-200" },
                { icon: <Share2 className="h-16 w-16 text-purple-600" />, title: "تعاون في الوقت الفعلي", desc: "عدة محللين يعملون في نفس الوقت مع اتصال صوتي مدمج", gradient: "from-purple-500/20 to-violet-500/20", border: "border-purple-200" }
              ].map((item) => (
                <Card key={item.title} className={`${item.border} hover:shadow-2xl transition-all duration-500 bg-gradient-to-br ${item.gradient} rounded-3xl transform hover:scale-105 h-full`}>
                  <CardHeader className="text-center pt-12 pb-8">
                    <div className="mx-auto mb-6 p-6 bg-white/90 backdrop-blur-sm rounded-2xl w-fit shadow-xl">{item.icon}</div>
                    <CardTitle className="text-3xl font-bold text-slate-900 mb-4">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-8 pb-12">
                    <p className="text-slate-600 text-center text-lg leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 rounded-3xl p-12 text-white text-center shadow-2xl">
              <h3 className="text-4xl font-bold mb-6">النتيجة: أداء فريقك يصل للقمة</h3>
              <p className="text-2xl opacity-95 max-w-5xl mx-auto leading-relaxed">
                اتخذ قرارات تكتيكية مبنية على بيانات دقيقة، حسّن تحضير المباريات، وحقق أقصى إمكانات لاعبيك
              </p>
            </div>
          </div>
        </div>
      )
    },
    
    // Slide 4: Enhanced Core Features
    {
      id: 'features',
      title: 'الميزات الرئيسية للمنصة',
      subtitle: 'كل ما يحتاجه ناديك في حل واحد',
      content: (
        <div className="h-full flex items-center">
          <div className="grid grid-cols-2 gap-12 w-full text-right">
            {[
              { category: "📊 تحليل ومتابعة", features: [{ icon: <Timer />, text: "تسجيل الأحداث مباشرة بواجهة 'بيانو'" }, { icon: <Map />, text: "تتبع موقع الكرة واللاعبين على الميدان" }, { icon: <BarChart />, text: "إحصائيات متقدمة ومؤشرات أداء مخصصة" }, { icon: <LineChart />, text: "رسوم بيانية رادارية وخرائط حرارية" }], color: "blue" },
              { category: "🎥 فيديو وتصور", features: [{ icon: <Video />, text: "تحليل فيديو متزامن مع البيانات" }, { icon: <Camera />, text: "تكامل مع يوتيوب ومصادر فيديو متعددة" }, { icon: <Eye />, text: "مراجعة تكتيكية مع شروحات وعلامات" }, { icon: <PlayCircle />, text: "قوائم تشغيل للأحداث من أجل التكوين" }], color: "green" },
              { category: "👥 تعاون وإدارة", features: [{ icon: <Users />, text: "إدارة كاملة للفرق واللاعبين" }, { icon: <Mic />, text: "اتصال صوتي في الوقت الفعلي" }, { icon: <Bell />, text: "نظام إشعارات وتعيين مهام" }, { icon: <Settings />, text: "أدوار وصلاحيات قابلة للتخصيص" }], color: "purple" },
              { category: "📈 تقارير وتحليلات", features: [{ icon: <PieChart />, text: "لوحات مؤشرات أداء حية" }, { icon: <FileText />, text: "تقارير مفصلة تلقائية" }, { icon: <TrendingUp />, text: "تحليل مقارن للأداء" }, { icon: <Database />, text: "تصدير البيانات وتكاملات API" }], color: "orange" }
            ].map((section) => (
              <Card key={section.category} className={`p-8 bg-white/70 backdrop-blur-sm border-2 border-${section.color}-200 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300`}>
                <h3 className="text-3xl font-bold text-slate-900 mb-8">{section.category}</h3>
                <div className="space-y-6">
                  {section.features.map((feature) => (
                    <div key={feature.text} className="flex items-center justify-end gap-4 p-3 bg-white/60 rounded-xl">
                      <span className="text-slate-700 text-lg font-medium flex-1">{feature.text}</span>
                      <div className={`p-3 bg-${section.color}-100 rounded-xl text-${section.color}-600 shadow-inner`}>{feature.icon}</div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )
    },

    // Slide 5: Enhanced Technology
    {
      id: 'technology',
      title: 'ابتكار تكنولوجي',
      subtitle: 'تقنيات متطورة لنتائج استثنائية',
      content: (
        <div className="h-full flex items-center">
          <div className="grid grid-cols-2 gap-16 w-full text-right">
            <div className="space-y-10">
              <h3 className="text-4xl font-bold text-slate-900">بنية حديثة</h3>
              <div className="space-y-8">
                {[
                  { icon: <Globe className="h-12 w-12 text-blue-600" />, title: "على السحابة (Cloud)", desc: "وصول من أي مكان، مزامنة تلقائية", color: "blue" },
                  { icon: <Shield className="h-12 w-12 text-green-600" />, title: "أمان عالي المستوى", desc: "بيانات محمية، توافق مع المعايير", color: "green" },
                  { icon: <Zap className="h-12 w-12 text-yellow-600" />, title: "أداء فائق", desc: "أوقات استجابة سريعة جداً", color: "yellow" },
                  { icon: <Smartphone className="h-12 w-12 text-purple-600" />, title: "متعددة المنصات", desc: "ويب، موبايل، وإضافة كروم", color: "purple" }
                ].map((tech) => (
                  <div key={tech.title} className={`flex gap-6 p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-l-4 border-${tech.color}-400 hover:shadow-2xl transition-all duration-300`}>
                    <div className="flex-shrink-0 p-4 bg-gray-50 rounded-xl shadow-inner">{tech.icon}</div>
                    <div className="flex-1">
                      <h4 className="text-2xl font-bold text-slate-900 mb-3">{tech.title}</h4>
                      <p className="text-slate-600 text-lg">{tech.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-10">
              <h3 className="text-4xl font-bold text-slate-900">ميزات متقدمة</h3>
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-12 rounded-3xl border-2 border-blue-200 shadow-2xl space-y-10">
                {[
                  { icon: <Mic className="h-12 w-12 text-white" />, title: "اتصال صوتي مدمج", desc: "تنسيق فوري بين المحللين أثناء المباراة", bg: "bg-blue-600" },
                  { icon: <Activity className="h-12 w-12 text-white" />, title: "واجهة 'بيانو' ثورية", desc: "إدخال بيانات سريع ودقيق مثل العزف على البيانو", bg: "bg-indigo-600" },
                  { icon: <Bell className="h-12 w-12 text-white" />, title: "إشعارات ذكية", desc: "تعيين مهام تلقائي وتنبيهات للأحداث المهمة", bg: "bg-purple-600" }
                ].map((feature) => (
                   <div key={feature.title} className="flex items-center gap-6 p-6 bg-white/70 rounded-2xl shadow-lg">
                     <div className={`p-4 rounded-xl shadow-lg ${feature.bg}`}>{feature.icon}</div>
                     <div className="flex-1">
                       <h4 className="text-2xl font-bold text-slate-900 mb-2">{feature.title}</h4>
                       <p className="text-slate-600 text-lg">{feature.desc}</p>
                     </div>
                   </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 6: Enhanced Pricing
    {
      id: 'pricing',
      title: 'عروض وأسعار',
      subtitle: 'حلول مناسبة لكل نوع من الأندية',
      content: (
        <div className="h-full flex items-center justify-center">
          <div className="space-y-12 w-full max-w-7xl">
            <div className="grid grid-cols-3 gap-10">
              {[
                { name: "باقة الهواة", price: "حسب الطلب", description: "مثالية لأندية الهواة وفرق الشبان", icon: <Star className="h-8 w-8 text-blue-600" />, features: ["حتى 5 مباريات في الشهر", "2 محللين في نفس الوقت", "إحصائيات أساسية", "دعم عبر الإيميل"], buttonText: "اطلب عرض سعر", gradient: "from-blue-50 to-slate-50", border: "border-blue-200" },
                { name: "باقة شبه الاحتراف", price: "حسب الطلب", description: "للأندية شبه المحترفة ومراكز التكوين", icon: <Crown className="h-8 w-8 text-purple-600" />, features: ["مباريات غير محدودة", "10 محللين في نفس الوقت", "تحليل فيديو كامل", "إحصائيات متقدمة", "اتصال صوتي", "دعم ذو أولوية"], popular: true, buttonText: "اطلب عرض سعر", gradient: "from-purple-50 to-blue-50", border: "border-purple-300" },
                { name: "باقة الاحتراف", price: "على المقاس", description: "حل متكامل للأندية المحترفة الكبيرة", icon: <Shield className="h-8 w-8 text-emerald-600" />, features: ["إعدادات مخصصة", "محللين بلا حدود", "بنية تحتية مخصصة", "دعم 24/7", "تطوير حسب الطلب"], buttonText: "اتصل بنا", gradient: "from-emerald-50 to-green-50", border: "border-emerald-200" }
              ].map((plan) => (
                <Card key={plan.name} className={`transition-all duration-500 rounded-3xl overflow-hidden flex flex-col relative ${plan.popular ? `bg-gradient-to-br ${plan.gradient} ${plan.border} border-2 shadow-2xl scale-105 z-10` : `bg-gradient-to-br ${plan.gradient} ${plan.border} border-2 shadow-xl hover:shadow-2xl hover:scale-102`}`}>
                  {plan.popular && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
                      <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 shadow-xl font-bold text-lg rounded-full">
                        الأكثر طلباً
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pt-12 pb-6">
                    <div className="mx-auto mb-6 p-4 bg-white/90 backdrop-blur-sm rounded-2xl w-fit shadow-lg">{plan.icon}</div>
                    <CardTitle className="text-3xl font-bold text-slate-900 mb-4">{plan.name}</CardTitle>
                    <div className="mb-4">
                      <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                    </div>
                    <p className="text-slate-600 px-4 text-lg leading-relaxed">{plan.description}</p>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 flex flex-col flex-grow">
                    <ul className="space-y-4 mb-8 flex-grow text-right">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center justify-end gap-3">
                          <span className="text-slate-700 text-lg">{feature}</span>
                          <Check className="h-6 w-6 text-green-500 flex-shrink-0" />
                        </li>
                      ))}
                    </ul>
                    <Button className={`w-full shadow-lg hover:shadow-xl transition-all duration-300 py-4 mt-auto font-bold text-lg rounded-xl ${plan.popular ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' : plan.name === 'باقة الاحتراف' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                      {plan.buttonText}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-center text-slate-500 italic text-xl">عروض الأسعار بالدينار (DZD) أو الأورو (€)، كيما تحب</p>
          </div>
        </div>
      )
    },

    // Slide 7: Implementation
    {
      id: 'implementation',
      title: 'التنفيذ والمرافقة',
      subtitle: 'نحن معك من التوقيع إلى النجاح',
      content: (
        <div className="h-full flex items-center">
          <div className="grid grid-cols-2 gap-16 w-full text-right">
            <div className="space-y-10">
              <h3 className="text-4xl font-bold text-slate-900">مسار التنفيذ</h3>
              <div className="space-y-8">
                {[
                  { step: "1", title: "تحليل الاحتياجات", desc: "تقييم مخصص لعملياتك الحالية وتحديد المتطلبات", duration: "أسبوع", color: "bg-blue-600" },
                  { step: "2", title: "إعداد مخصص", desc: "ضبط الإعدادات والواجهات حسب متطلبات النادي", duration: "أسبوعين", color: "bg-indigo-600" },
                  { step: "3", title: "تكوين الفرق", desc: "تكوين شامل للمحللين والطاقم الفني والإداري", duration: "أسبوع", color: "bg-purple-600" },
                  { step: "4", title: "إطلاق تدريجي", desc: "الانطلاق في الإنتاج مع مرافقة مستمرة وحل المشاكل", duration: "أسبوعين", color: "bg-green-600" }
                ].map((phase) => (
                  <div key={phase.step} className="flex gap-8 p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-r-4 border-blue-500 hover:shadow-2xl transition-all duration-300">
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="secondary" className="px-4 py-2 text-lg font-semibold">{phase.duration}</Badge>
                        <h4 className="text-2xl font-bold text-slate-900">{phase.title}</h4>
                      </div>
                      <p className="text-slate-600 text-lg leading-relaxed">{phase.desc}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className={`w-16 h-16 ${phase.color} rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg`}>
                        {phase.step}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-10">
              <h3 className="text-4xl font-bold text-slate-900">الدعم والخدمات</h3>
              <div className="space-y-8">
                <Card className="p-10 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl shadow-xl">
                  <div className="flex items-center justify-end gap-6 mb-6">
                    <h4 className="text-3xl font-bold text-slate-900">دعم فني 24/7</h4>
                    <Headphones className="h-12 w-12 text-green-600" />
                  </div>
                  <ul className="space-y-4 text-slate-700 text-lg">
                    <li className="flex items-center justify-end gap-3">
                      <span>دعم مباشر عبر الهاتف والواتساب (بالدارجة والفرنسية)</span>
                      <Check className="h-6 w-6 text-green-600" />
                    </li>
                    <li className="flex items-center justify-end gap-3">
                      <span>حل المشاكل في وقت مضمون أقل من ساعة</span>
                      <Check className="h-6 w-6 text-green-600" />
                    </li>
                    <li className="flex items-center justify-end gap-3">
                      <span>تحديثات مجانية للميزات الجديدة</span>
                      <Check className="h-6 w-6 text-green-600" />
                    </li>
                  </ul>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // Slide 8: Contact
    {
      id: 'contact',
      title: 'ابدأ رحلتك نحو التميز',
      subtitle: 'اتصل بنا اليوم واحصل على عرض مخصص لناديك',
      content: (
        <div className="h-full flex items-center justify-center">
          <div className="text-center space-y-12 max-w-4xl">
            <div className="grid grid-cols-2 gap-12">
              <Card className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl shadow-xl">
                <h3 className="text-3xl font-bold text-slate-900 mb-6">تواصل معنا</h3>
                <div className="space-y-4 text-lg text-slate-700">
                  <div className="flex items-center justify-center gap-3">
                    <span>contact@footballanalytics.dz</span>
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <span>+213 555 123 456</span>
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </Card>
              <Card className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl shadow-xl">
                <h3 className="text-3xl font-bold text-slate-900 mb-6">عرض تجريبي مجاني</h3>
                <p className="text-lg text-slate-700 mb-6">
                  احجز جلسة عرض تجريبي مخصصة لناديك
                </p>
                <Button className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-4 text-lg font-bold rounded-xl shadow-lg">
                  احجز العرض التجريبي
                </Button>
              </Card>
            </div>
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-12 text-white">
              <h3 className="text-4xl font-bold mb-6">شكراً لوقتكم</h3>
              <p className="text-2xl opacity-90">
                معاً نبني مستقبل كرة القدم الجزائرية
              </p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-green-50 relative" dir="rtl">
      {/* Presentation Container */}
      <div className="relative h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="flex items-center gap-2"
            >
              <Fullscreen className="h-4 w-4" />
              {isFullscreen ? 'خروج من الشاشة الكاملة' : 'شاشة كاملة'}
            </Button>
          </div>
          
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900">{slides[currentSlide].title}</h2>
            <p className="text-slate-600">{slides[currentSlide].subtitle}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              {currentSlide + 1} / {slides.length}
            </span>
          </div>
        </div>

        {/* Slide Content */}
        <div className="flex-1 px-8 py-8 overflow-auto">
          {slides[currentSlide].content}
        </div>

        {/* Navigation */}
        <div className="bg-white/80 backdrop-blur-sm border-t border-slate-200/50 px-8 py-4">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              السابق
            </Button>
            
            <div className="flex gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? 'bg-blue-600' 
                      : 'bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
            
            <Button
              variant="outline"
              onClick={nextSlide}
              disabled={currentSlide === slides.length - 1}
              className="flex items-center gap-2"
            >
              التالي
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessPresentation;
