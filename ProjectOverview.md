
# Các ví dụ AsyncRequestReply

- Đặt hàng shopee mà chặn cả app cho đến khi nhận được hàng.
- Các ứng dụng ví điện tử như ZaloPay đôi khi có thời gian để xử lí giao dịch tầm vài phút. Không thể chặn cả ứng dụng để đợi giao dịch hoàn thành.


# Nội dung

## Microsoft Learn

- Bối cảnh và vấn đề:
	- Trong bối cảnh hiện tại, ứng dụng phía client phụ thuộc vào APIs để cung cấp các business logic, thường các API calls hoạt động trên giao thức HTTP(s) 
	- Trong hầu hết các trường hợp, các API phản hồi rất nhanh (100 ms hoặc nhanh hơn), có rất nhiều yếu tố có thể ảnh hưởng tới tốc độ phản hồi:
		- Các lớp bảo mật
		- Hạ tầng mạng
		- Kích thước nội dung trả về
		- Thời gian mà phía backend xử lí request
	- Trong một số trường hợp phía backend cần xử lí phần việc nào đó tốn nhiều thời gian (có thể vài phút, vài giờ cho đến vài ngày). Khi đó, không thể đợi đến khi phần việc hoàn thành rồi mới phản hồi lại, đây là 1 vấn đề nghiêm trọng cho bất kì hệ thống sử dụng mẫu thiết kế phản hồi đồng bộ.
- Giải pháp
	- 1 giải pháp là dùng HTTP polling. Polling hữu dụng cho phía client, có thể xuất hiện nhiều khó khăn khi cung cấp call-back endpoints hoặc là sử dụng các kết nối dài hạn (Long running connections). Kể cả khi có thể sử dụng call-back endpoints, nó có thể cần nhiều thư viện, dịch vụ và đôi lúc có thể tạo thêm quá nhiều độ phức tạp.
		- HTTP polling là một phương pháp mà một client định kỳ gửi các yêu cầu HTTP tới server để kiểm tra xem một tác vụ dài đang chạy trên server đã hoàn thành hay chưa
		- **Call-back endpoints** là các địa chỉ (URL) trên phía client hoặc một dịch vụ khác mà server có thể gọi lại để cung cấp phản hồi hoặc thông tin khi một tác vụ hoàn thành.
	- Phía client gọi API để gửi request tới server, kích hoạt phần việc cần xử lý ở phía backend.
	- API phản hồi nhanh nhất có thể. Trả về status 202 (Accepted), request lúc này đã được chấp nhận và xử lí.
		- Nếu request không hợp lệ, có thể trả về status 400 (Bad request)
	- Phản hồi từ API có chứa 1 địa chỉ mà phía client có thể poll để kiểm tra trạng thái hoàn thành của phần việc cần xử lí
	- Với mỗi lần gọi thành công, trả về status 200. Một khi phần việc đã hoàn thành, endpoint trả về kết quả của phần việc đó.
	- ![ảnh](https://learn.microsoft.com/en-us/azure/architecture/patterns/_images/async-request.png)
- Issues and considerations
	- Có rất nhiều cách triển khai pattern này trên HTTP, không phải dịch vụ nào cũng có cách triển khai giống nhau. Ví dụ: Hầu hết các dịch vụ sẽ không trả về status 202 khi phần việc chưa hoàn thành mà trả về status 404 (Not found)
	- Response với status 202 nên trả về
		- địa chỉ của status endpoint 
		- khoảng thời gian delay giữa các lần gọi status endpoint
    - Có thể cung cấp cho phía client khả năng hủy xử lí phần việc.
- Khi nào nên sử dụng pattern
	- Sử dụng pattern này cho:
		- Pattern này rất phù hợp cho các tác vụ xử lý lâu dài như xử lý hàng loạt (batch processing), tạo báo cáo, xử lý dữ liệu lớn, hoặc bất kỳ tác vụ nào có thời gian hoàn thành không thể đoán trước. 
		- Nó cũng hữu ích trong các trường hợp phía client không thể cung cấp callback endpoint hoặc không thể duy trì kết nối dài hạn.
	- Các trường có thể không phù hợp để sử dụng pattern:
		- Response cần trả về trong thời gian thực về phía client. Ví dụ: Các giao dịch tài chính, tương tác trực tiếp với người dùng, hoặc các hệ thống yêu cầu phản hồi nhanh chóng
		- Dễ dàng sử dụng callback endpoint
- Xử lý lỗi và Khả năng chịu lỗi: Để đảm bảo tính ổn định và khả năng phục hồi của hệ thống khi sử dụng Asynchronous Request-Reply pattern, cần xem xét cẩn thận các tình huống lỗi và cách xử lý chúng. Dưới đây là các điểm cần chú ý:
    - Xử lý lỗi khi polling thất bại:
        - Nếu client gửi yêu cầu kiểm tra trạng thái (polling) và không nhận được phản hồi từ server (do lỗi mạng hoặc server quá tải), client nên: 
            - Thực hiện retry (thử lại) với chiến lược exponential backoff. Điều này có nghĩa là khoảng thời gian giữa các lần thử lại sẽ tăng dần theo từng lần thất bại, chẳng hạn: 1 giây, 2 giây, 4 giây, 8 giây, v.v.
            - Nếu sau nhiều lần retry vẫn không thành công, client nên đưa ra thông báo lỗi cho người dùng, và có thể tạm dừng yêu cầu hoặc lưu lại để xử lý sau.
        - Tránh việc retry liên tục mà không giới hạn số lần thử lại, vì điều này có thể gây quá tải cho server và mạng.
    - Xử lý lỗi từ phía server:
        - Khi tác vụ ở phía backend gặp lỗi trong quá trình xử lý (ví dụ: lỗi dữ liệu, lỗi phần cứng), server cần:
            - Trả về mã trạng thái HTTP thích hợp, chẳng hạn như 500 (Internal Server Error), kèm theo thông báo lỗi chi tiết để client có thể hiểu được nguyên nhân.
            - Ngoài ra, có thể sử dụng mã 503 (Service Unavailable) nếu lỗi tạm thời và hệ thống có thể phục hồi trong tương lai.
            - Server nên có cơ chế ghi log chi tiết mỗi lần xảy ra lỗi để đội ngũ vận hành có thể phát hiện và khắc phục sớm.
    - Timeout và việc quản lý thời gian chờ:
        - Client cần đặt một timeout khi gửi yêu cầu polling. Nếu thời gian chờ vượt quá một khoảng thời gian nhất định (ví dụ: 30 giây hoặc 1 phút), client nên ngừng việc chờ và đưa ra thông báo lỗi cho người dùng.
    - Cơ chế hủy bỏ yêu cầu (Cancellation):
        - Hệ thống có thể cung cấp cho client một endpoint riêng để hủy bỏ tác vụ đang xử lý. Điều này đặc biệt hữu ích khi người dùng muốn dừng yêu cầu, chẳng hạn như trong các thao tác mà kết quả không còn cần thiết.
        - Khi nhận được yêu cầu hủy bỏ, server nên dừng tác vụ và trả về phản hồi cho client với trạng thái 200 OK để xác nhận đã hủy thành công.
- Vấn đề bảo mật:
    - Xác thực và phân quyền (Authentication & Authorization)
        - Mỗi yêu cầu polling từ phía client cần phải được xác thực để đảm bảo rằng chỉ những người dùng hoặc ứng dụng được ủy quyền mới có thể kiểm tra trạng thái của tác vụ
        - Phân quyền (authorization) cũng quan trọng. Mỗi client chỉ nên được phép kiểm tra trạng thái của những tác vụ mà họ đã khởi tạo, để tránh việc client này xem thông tin tác vụ của client khác
    - Phòng chống tấn công lặp lại (Replay Attack)
        - Để tránh việc tấn công lặp lại (replay attack), mỗi lần yêu cầu polling phải đi kèm với một token hoặc mã định danh (ID) duy nhất, liên quan đến tác vụ ban đầu
        - Token này có thể chứa các thông tin về thời gian hoặc ngữ cảnh phiên làm việc (session) của client, giúp server xác định rằng yêu cầu đến từ một client hợp lệ và không bị lặp lại bởi một bên thứ ba không được ủy quyền
    - Mã hóa giao tiếp (Encryption)
        - Tất cả các yêu cầu từ client tới server và ngược lại nên được mã hóa qua HTTPS để đảm bảo dữ liệu không bị lộ hoặc can thiệp bởi các cuộc tấn công trung gian (man-in-the-middle)
    - Quản lý endpoint polling
        - Endpoint kiểm tra trạng thái (polling endpoint) nên được bảo vệ bằng cơ chế giới hạn tần suất yêu cầu (rate limiting) để tránh bị lạm dụng hoặc tấn công từ chối dịch vụ (DDoS)
        - Đảm bảo rằng client không thể gửi yêu cầu polling quá thường xuyên bằng cách áp đặt các khoảng thời gian hợp lý giữa các lần polling (ví dụ: mỗi 10 giây một lần)
    - Theo dõi và ghi log (Monitoring & Logging)
        - Theo dõi và ghi log các hoạt động polling là điều cần thiết để phát hiện các hoạt động bất thường, chẳng hạn như các nỗ lực gửi yêu cầu không hợp lệ hoặc quá nhiều yêu cầu từ một client đơn lẻ
        - Hệ thống cần có khả năng phát hiện và cảnh báo sớm khi có dấu hiệu tấn công bảo mật